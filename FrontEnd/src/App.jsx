import { useState, useRef, useEffect } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import EmojiPicker from 'emoji-picker-react'

const obtenerColorUsuario = (nombre) => {
  const colores = ['text-rose-500', 'text-blue-500', 'text-amber-500', 'text-violet-500', 'text-pink-500', 'text-cyan-500', 'text-emerald-500', 'text-fuchsia-500'];
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) { hash = nombre.charCodeAt(i) + ((hash << 5) - hash); }
  return colores[Math.abs(hash) % colores.length];
};

// ¡NUEVO! Temas integrales para TODA la aplicación
const temasChat = [
  { 
    nombre: "Latte Clásico", 
    hex: "#f2ebd9",
    bgApp: "bg-[#e8e2d7]",
    bgPanel: "bg-[#fdfbf7]",
    bgChat: "bg-[#f2ebd9]",
    bgInput: "bg-[#f2ebd9]",
    border: "border-[#e3dac9]",
    textMain: "text-stone-800",
    textMuted: "text-stone-500",
    hover: "hover:bg-[#f2ebd9]",
    bgMio: "bg-gradient-to-br from-indigo-500 to-purple-600", 
    textMio: "text-white",
    bgSuyo: "bg-[#fdfbf7]",
    textSuyo: "text-stone-800",
    shadow: "shadow-stone-300/30"
  },
  { 
    nombre: "Modo Noche", 
    hex: "#0f172a",
    bgApp: "bg-slate-950",
    bgPanel: "bg-slate-900",
    bgChat: "bg-slate-950",
    bgInput: "bg-slate-800",
    border: "border-slate-800",
    textMain: "text-slate-100",
    textMuted: "text-slate-400",
    hover: "hover:bg-slate-800",
    bgMio: "bg-gradient-to-br from-indigo-500 to-blue-600", 
    textMio: "text-white",
    bgSuyo: "bg-slate-800",
    textSuyo: "text-slate-100",
    shadow: "shadow-black/50"
  },
  { 
    nombre: "Bosque Oscuro", 
    hex: "#064e3b",
    bgApp: "bg-emerald-950",
    bgPanel: "bg-emerald-900",
    bgChat: "bg-[#022c22]",
    bgInput: "bg-emerald-950",
    border: "border-emerald-800/50",
    textMain: "text-emerald-50",
    textMuted: "text-emerald-300",
    hover: "hover:bg-emerald-800",
    bgMio: "bg-gradient-to-br from-emerald-500 to-teal-600", 
    textMio: "text-white",
    bgSuyo: "bg-emerald-800",
    textSuyo: "text-emerald-50",
    shadow: "shadow-black/40"
  },
  { 
    nombre: "Cielo Despejado", 
    hex: "#e0f2fe",
    bgApp: "bg-sky-100",
    bgPanel: "bg-white",
    bgChat: "bg-sky-50",
    bgInput: "bg-sky-100",
    border: "border-sky-200",
    textMain: "text-sky-950",
    textMuted: "text-sky-600",
    hover: "hover:bg-sky-50",
    bgMio: "bg-gradient-to-br from-sky-500 to-blue-600", 
    textMio: "text-white",
    bgSuyo: "bg-white",
    textSuyo: "text-sky-950",
    shadow: "shadow-sky-200/50"
  },
  { 
    nombre: "Sakura", 
    hex: "#fdf2f8",
    bgApp: "bg-pink-100",
    bgPanel: "bg-white",
    bgChat: "bg-pink-50",
    bgInput: "bg-pink-100",
    border: "border-pink-200",
    textMain: "text-pink-950",
    textMuted: "text-pink-500",
    hover: "hover:bg-pink-50",
    bgMio: "bg-gradient-to-br from-pink-500 to-rose-600", 
    textMio: "text-white",
    bgSuyo: "bg-white",
    textSuyo: "text-pink-950",
    shadow: "shadow-pink-200/50"
  }
];

function App() {
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [usuarios, setUsuarios] = useState([]); 
  const [username, setUsername] = useState("");
  const [registrado, setRegistrado] = useState(false);
  const [chatActual, setChatActual] = useState("General"); 
  const [noLeidos, setNoLeidos] = useState({});
  const [mostrarEmojis, setMostrarEmojis] = useState(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  
  const [temaActual, setTemaActual] = useState(temasChat[0]); 
  const [mostrarMenuFondo, setMostrarMenuFondo] = useState(false);

  const stompClient = useRef(null);
  const chatActualRef = useRef(chatActual);
  const fileInputRef = useRef(null);
  const mensajesEndRef = useRef(null);
  
  useEffect(() => { chatActualRef.current = chatActual; }, [chatActual]);

  useEffect(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  const conectar = async () => {
    if (!username.trim()) return; 

    try {
      const respuesta = await fetch('http://localhost:8080/api/historial');
      if (respuesta.ok) {
        const historial = await respuesta.json();
        setMensajes(historial);
      }
    } catch (error) { console.error("Error cargando historial", error); }

    const socket = new SockJS('http://localhost:8080/chat-websocket');
    const client = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        client.subscribe('/topic/public', (mensaje) => {
          const msg = JSON.parse(mensaje.body);
          if (msg.remitente === username) {
            setMensajes(prev => prev.map(m => m.idMensaje === msg.idMensaje ? msg : m));
          } else {
            setMensajes(prev => [...prev, msg]);
            if (chatActualRef.current !== "General") setNoLeidos(prev => ({...prev, "General": (prev["General"] || 0) + 1}));
          }
        });

        client.subscribe('/topic/privado.' + username, (mensaje) => {
          const msg = JSON.parse(mensaje.body);
          if (msg.remitente === username) {
            setMensajes(prev => prev.map(m => m.idMensaje === msg.idMensaje ? msg : m));
            return;
          }
          setMensajes(prev => {
            if (prev.some(m => m.idMensaje === msg.idMensaje)) return prev; 
            return [...prev, msg];
          });
          
          let nuevoEstado = "RECIBIDO";
          if (chatActualRef.current === msg.remitente) {
            nuevoEstado = "LEIDO";
          } else {
            setNoLeidos(prev => ({...prev, [msg.remitente]: (prev[msg.remitente] || 0) + 1}));
          }

          client.publish({
            destination: '/app/chat.actualizarEstado',
            body: JSON.stringify({ ...msg, estado: nuevoEstado })
          });
        });

        client.subscribe('/topic/usuarios', (lista) => { setUsuarios(JSON.parse(lista.body)); });
        client.publish({ destination: '/app/chat.registrar', body: username });
        setRegistrado(true); 
      }
    });

    client.activate();
    stompClient.current = client;
  };

  const enviarMensaje = (contenido = nuevoMensaje, urlArchivo = null, tipoArchivo = null) => {
    if (!stompClient.current || !stompClient.current.connected) return;
    if (!urlArchivo && contenido.trim() === "") return;

    const idUnico = Date.now().toString() + Math.random().toString(36).substring(2);
    const mensaje = { 
      idMensaje: idUnico, remitente: username, contenido: contenido,
      destinatario: chatActual, estado: "ENVIADO", archivoUrl: urlArchivo, tipoArchivo: tipoArchivo
    };
    
    setMensajes(prev => [...prev, { ...mensaje, estado: "PENDIENTE" }]);
    const rutaDestino = chatActual === "General" ? '/app/chat.enviar' : '/app/chat.privado';

    setTimeout(() => {
      stompClient.current.publish({ destination: rutaDestino, body: JSON.stringify(mensaje) });
      setMensajes(prev => prev.map(m => m.idMensaje === idUnico ? { ...m, estado: "ENVIADO" } : m));
    }, 400);
    
    if (!urlArchivo) setNuevoMensaje(""); 
  };

  const manejarSubidaArchivo = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSubiendoArchivo(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8080/api/archivos/subir", {
        method: "POST", body: formData
      });

      if (response.ok) {
        const data = await response.json();
        let tipo = "DOCUMENTO";
        if (file.type.startsWith("image/")) tipo = "IMAGEN";
        else if (file.type.startsWith("video/")) tipo = "VIDEO";
        enviarMensaje(file.name, data.url, tipo);
      }
    } catch (error) {
      console.error("Error subiendo archivo", error);
      alert("Hubo un error al subir el archivo.");
    } finally {
      setSubiendoArchivo(false);
      event.target.value = null; 
    }
  };

  const cambiarChat = (nuevoChat) => {
    setChatActual(nuevoChat);
    setNoLeidos(prev => ({...prev, [nuevoChat]: 0}));
    setMostrarEmojis(false);
    setMostrarMenuFondo(false);
    
    const mensajesSinLeer = mensajes.filter(m => m.remitente === nuevoChat && m.estado !== "LEIDO");
    if (mensajesSinLeer.length > 0) {
      mensajesSinLeer.forEach(msg => {
        stompClient.current.publish({
          destination: '/app/chat.actualizarEstado',
          body: JSON.stringify({ ...msg, estado: "LEIDO" })
        });
      });
      setMensajes(prev => prev.map(m => (m.remitente === nuevoChat && m.estado !== "LEIDO") ? { ...m, estado: "LEIDO" } : m));
    }
  };

  const mensajesFiltrados = mensajes.filter(msg => {
    if (chatActual === "General") return msg.destinatario === "General" || !msg.destinatario;
    return (msg.remitente === username && msg.destinatario === chatActual) || (msg.remitente === chatActual && msg.destinatario === username);
  });

  const renderTicks = (estado, esMio) => {
    const colorTick = esMio ? "text-white/60" : temaActual.textMuted;
    const colorLeido = esMio ? "text-white font-black" : "text-blue-500 font-black";
    
    if (estado === "PENDIENTE") return <span className={`text-[10px] font-bold ml-1 ${colorTick}`}>🕒</span>;
    if (estado === "ENVIADO") return <span className={`text-[11px] font-bold ml-1 ${colorTick}`}>✓</span>;
    if (estado === "RECIBIDO") return <span className={`text-[11px] font-bold ml-1 ${colorTick}`}>✓✓</span>;
    if (estado === "LEIDO") return <span className={`text-[11px] ml-1 ${colorLeido}`}>✓✓</span>;
    return null;
  };

  // --- PANTALLA DE INICIO DINÁMICA ---
  if (!registrado) {
    return (
      <div className={`flex items-center justify-center h-screen ${temaActual.bgApp} font-sans transition-colors duration-500`}>
        <div className={`${temaActual.bgPanel} p-10 rounded-3xl shadow-2xl text-center w-[400px] border ${temaActual.border} relative overflow-hidden transition-colors duration-500`}>
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full blur-3xl opacity-10"></div>
          
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-6 shadow-lg shadow-indigo-200/50 transform rotate-3 relative flex items-center justify-center">
            <span className="text-[44px] z-10 drop-shadow-sm">😃</span>
            <span className="text-[26px] absolute bottom-1.5 left-1.5 z-20 transform -rotate-12 drop-shadow-md">🤙</span>
          </div>

          <h1 className="text-3xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            QuePasapp
          </h1>
          <p className={`${temaActual.textMuted} mb-8 font-medium transition-colors`}>Conecta al instante.</p>
          <input 
            type="text" placeholder="¿Cómo te llamas?" 
            className={`w-full ${temaActual.bgInput} border ${temaActual.border} p-4 rounded-xl mb-6 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner ${temaActual.textMain}`} 
            value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && conectar()} 
          />
          <button 
            onClick={conectar} 
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold px-4 py-4 rounded-xl shadow-lg shadow-indigo-200/50 transition-all transform hover:-translate-y-1"
          >
            Entrar a la sala
          </button>
        </div>
      </div>
    );
  }

  // --- PANTALLA PRINCIPAL DINÁMICA ---
  return (
    <div className={`flex h-screen ${temaActual.bgApp} p-4 gap-4 font-sans transition-colors duration-500`}>
      
      {/* BARRA LATERAL */}
      <div className={`w-1/4 min-w-[280px] ${temaActual.bgPanel} rounded-3xl flex flex-col shadow-xl ${temaActual.shadow} border ${temaActual.border} overflow-hidden transition-colors duration-500`}>
        <div className="p-6 pb-4 flex items-center justify-between">
          <h2 className={`font-extrabold text-2xl ${temaActual.textMain} tracking-tight transition-colors`}>Chats</h2>
          <div className="flex items-center gap-2 bg-indigo-50/10 px-3 py-1 rounded-full border border-indigo-500/20">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
            <span className="text-indigo-500 text-xs font-bold">{usuarios.length} activos</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          <div 
            onClick={() => cambiarChat("General")} 
            className={`p-3 rounded-2xl cursor-pointer flex items-center gap-4 transition-all duration-300 ${chatActual === "General" ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/30" : `${temaActual.hover} ${temaActual.textMain}`}`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm ${chatActual === "General" ? "bg-white/20 text-white" : `${temaActual.bgInput} text-indigo-500 border ${temaActual.border}`}`}>
              🌍
            </div>
            <span className="font-bold text-lg flex-1">Global</span>
            {noLeidos["General"] > 0 && <span className="bg-rose-500 text-white text-xs font-extrabold w-6 h-6 flex items-center justify-center rounded-full shadow-md shadow-rose-500/50">{noLeidos["General"]}</span>}
          </div>

          {usuarios.filter(u => u !== username).map((u, i) => (
            <div 
              key={i} onClick={() => cambiarChat(u)} 
              className={`p-3 rounded-2xl cursor-pointer flex items-center gap-4 transition-all duration-300 ${chatActual === u ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/30" : `${temaActual.hover} ${temaActual.textMain}`}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl shadow-sm ${chatActual === u ? "bg-white/20 text-white" : `${temaActual.bgInput} text-indigo-500 border ${temaActual.border}`}`}>
                {u.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-lg flex-1">{u}</span>
              {noLeidos[u] > 0 ? (
                <span className="bg-rose-500 text-white text-xs font-extrabold w-6 h-6 flex items-center justify-center rounded-full shadow-md shadow-rose-500/50">{noLeidos[u]}</span>
              ) : (
                <span className={`w-2.5 h-2.5 rounded-full ${chatActual === u ? "bg-white" : "bg-emerald-400"} shadow-sm`}></span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={`flex-1 ${temaActual.bgPanel} rounded-3xl flex flex-col shadow-xl ${temaActual.shadow} border ${temaActual.border} overflow-hidden relative transition-colors duration-500`}>
        
        {/* CABECERA */}
        <div className={`px-8 py-5 border-b ${temaActual.border} flex items-center justify-between ${temaActual.bgPanel}/90 backdrop-blur-md z-10 transition-colors duration-500`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${temaActual.bgInput} rounded-xl flex items-center justify-center text-2xl border ${temaActual.border} shadow-sm transition-colors`}>
              {chatActual === "General" ? "🌍" : chatActual.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className={`font-extrabold text-xl ${temaActual.textMain} transition-colors`}>{chatActual === "General" ? "Sala Global" : chatActual}</h1>
              <p className={`text-sm ${temaActual.textMuted} font-medium transition-colors`}>{chatActual === "General" ? "Todos los miembros de la red" : "Mensajes cifrados de extremo a extremo"}</p>
            </div>
          </div>

          <div className="relative">
            <button 
              onClick={() => setMostrarMenuFondo(!mostrarMenuFondo)}
              className={`p-3 ${temaActual.bgInput} border ${temaActual.border} rounded-xl ${temaActual.hover} text-xl shadow-sm transition-all transform hover:scale-105`}
              title="Cambiar tema"
            >
              🎨
            </button>
            
            {mostrarMenuFondo && (
              <div className={`absolute right-0 mt-3 w-48 ${temaActual.bgPanel} rounded-2xl shadow-2xl border ${temaActual.border} overflow-hidden z-50`}>
                <div className={`${temaActual.bgInput} p-3 border-b ${temaActual.border}`}>
                  <span className={`text-xs font-bold ${temaActual.textMuted} uppercase tracking-wider`}>Estilo de la App</span>
                </div>
                {temasChat.map((tema) => (
                  <div 
                    key={tema.nombre}
                    onClick={() => { setTemaActual(tema); setMostrarMenuFondo(false); }}
                    className={`p-3 ${temaActual.hover} cursor-pointer flex items-center gap-3 transition-colors`}
                  >
                    <div className={`w-6 h-6 rounded-full shadow-inner border ${temaActual.border}`} style={{ backgroundColor: tema.hex }}></div>
                    <span className={`text-sm font-semibold ${temaActual.textMain}`}>{tema.nombre}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ZONA DE MENSAJES */}
        <div 
          className={`flex-1 p-8 overflow-y-auto ${temaActual.bgChat} flex flex-col shadow-inner transition-colors duration-500`} 
          onClick={() => { setMostrarEmojis(false); setMostrarMenuFondo(false); }}
        >
          {mensajesFiltrados.map((msg, index) => {
            const esMio = msg.remitente === username;
            const mensajeAnterior = index > 0 ? mensajesFiltrados[index - 1] : null;
            const esConsecutivo = mensajeAnterior && mensajeAnterior.remitente === msg.remitente;
            const margenTop = esConsecutivo ? "mt-1" : "mt-6";
            
            const redondearEsquinas = esMio 
              ? (esConsecutivo ? "rounded-2xl" : "rounded-2xl rounded-tr-sm") 
              : (esConsecutivo ? "rounded-2xl" : "rounded-2xl rounded-tl-sm");

            return (
              <div key={index} className={`flex flex-col ${esMio ? 'items-end' : 'items-start'} ${margenTop}`}>
                {!esMio && !esConsecutivo && <span className={`font-bold text-xs mb-1.5 ml-2 ${obtenerColorUsuario(msg.remitente)}`}>{msg.remitente}</span>}
                
                <div className={`px-5 py-3 shadow-md max-w-md flex flex-col gap-1 ${redondearEsquinas} ${
                  esMio 
                    ? `${temaActual.bgMio} ${temaActual.textMio}` 
                    : `${temaActual.bgSuyo} ${temaActual.textSuyo} border ${temaActual.border}`
                } transition-colors duration-500`}>
                  
                  {msg.tipoArchivo === "IMAGEN" && <img src={msg.archivoUrl} alt="adjunto" className="max-w-[200px] sm:max-w-xs rounded-xl mt-1 object-cover" />}
                  {msg.tipoArchivo === "VIDEO" && <video src={msg.archivoUrl} controls className="max-w-[200px] sm:max-w-xs rounded-xl mt-1" />}
                  {msg.tipoArchivo === "DOCUMENTO" && (
                    <a href={msg.archivoUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-colors ${esMio ? "bg-white/20 hover:bg-white/30" : `${temaActual.bgInput} hover:opacity-80`}`}>
                      <span className="text-xl">📄</span> {msg.contenido}
                    </a>
                  )}
                  
                  {!msg.tipoArchivo && <span className="leading-relaxed">{msg.contenido}</span>}
                  
                  <div className={`text-right flex items-center justify-end ${msg.tipoArchivo ? "mt-2" : ""}`}>
                    {esMio && chatActual !== "General" && renderTicks(msg.estado, esMio)}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={mensajesEndRef} />
        </div>

        {/* INPUT DE MENSAJES */}
        <div className={`p-6 ${temaActual.bgPanel} border-t ${temaActual.border} flex gap-3 relative items-center transition-colors duration-500`}>
          
          {mostrarEmojis && (
            <div className={`absolute bottom-24 left-6 z-50 shadow-2xl rounded-2xl overflow-hidden border ${temaActual.border}`}>
              <EmojiPicker onEmojiClick={(e) => { setNuevoMensaje(prev => prev + e.emoji); setMostrarEmojis(false); }} theme={temaActual.nombre === "Modo Noche" || temaActual.nombre === "Bosque Oscuro" ? "dark" : "light"} />
            </div>
          )}

          <button onClick={() => { setMostrarEmojis(!mostrarEmojis); setMostrarMenuFondo(false); }} className={`w-12 h-12 flex items-center justify-center rounded-xl ${temaActual.textMuted} hover:text-indigo-500 ${temaActual.hover} text-2xl transition-all`}>
            😊
          </button>

          <input type="file" className="hidden" ref={fileInputRef} onChange={manejarSubidaArchivo} />
          <button onClick={() => { fileInputRef.current.click(); setMostrarMenuFondo(false); }} disabled={subiendoArchivo} className={`w-12 h-12 flex items-center justify-center rounded-xl ${temaActual.textMuted} hover:text-indigo-500 ${temaActual.hover} text-xl transition-all`}>
            📎
          </button>

          <div className={`flex-1 ${temaActual.bgInput} border ${temaActual.border} rounded-2xl flex items-center px-4 focus-within:ring-2 focus-within:ring-indigo-500 transition-all shadow-inner`}>
            <input 
              type="text" 
              className={`w-full bg-transparent p-3 focus:outline-none ${temaActual.textMain} placeholder-opacity-60`} 
              placeholder={subiendoArchivo ? "Procesando archivo..." : `Escribe un mensaje a ${chatActual}...`} 
              value={nuevoMensaje} 
              onChange={(e) => setNuevoMensaje(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && enviarMensaje()} 
              disabled={subiendoArchivo} 
              onFocus={() => setMostrarMenuFondo(false)}
            />
          </div>

          <button 
            onClick={() => enviarMensaje()} 
            disabled={subiendoArchivo}
            className="w-14 h-14 flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl shadow-lg shadow-indigo-500/30 transition-all transform hover:scale-105"
          >
            <span className="transform rotate-45 text-xl -mt-1 -ml-1">➤</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default App