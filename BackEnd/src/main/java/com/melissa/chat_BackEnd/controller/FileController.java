package com.melissa.chat_BackEnd.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@RestController
@RequestMapping("/api/archivos")
public class FileController {

    private final String UPLOAD_DIR = "uploads/";

    @PostMapping("/subir")
    public ResponseEntity<?> subirArchivo(@RequestParam("file") MultipartFile file) {
        try {
            Path directorio = Paths.get(UPLOAD_DIR);
            if (!Files.exists(directorio)) {
                Files.createDirectories(directorio);
            }

            String nombreArchivo = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            Path rutaArchivo = directorio.resolve(nombreArchivo);
            Files.copy(file.getInputStream(), rutaArchivo);

            String url = "http://localhost:8080/archivos/" + nombreArchivo;
            return ResponseEntity.ok().body("{\"url\": \"" + url + "\"}");

        } catch (Exception e) {
            return ResponseEntity.status(500).body("{\"error\": \"Error al subir el archivo\"}");
        }
    }
}