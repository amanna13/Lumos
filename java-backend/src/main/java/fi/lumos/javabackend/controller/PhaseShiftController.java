package fi.lumos.javabackend.controller;


import fi.lumos.javabackend.entity.PhaseState;
import fi.lumos.javabackend.enums.Phases;
import fi.lumos.javabackend.services.PhaseShiftService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/phase")
public class PhaseShiftController {

    @Autowired
    public PhaseShiftService phaseShiftService;


    @GetMapping("/current-phase")
    public ResponseEntity<PhaseState> phaseShift() {
        PhaseState phaseState = phaseShiftService.getPhaseShift();
        return new ResponseEntity<>(phaseState, HttpStatus.OK);
    }

    @PostMapping("/update-phase")
    public ResponseEntity<?> updatePhase(@RequestBody Map<String, String> request) {
        String phaseStr = request.get("phase");
        if (phaseStr == null || phaseStr.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Phase is required"));
        }

        try {
            Phases newPhase = Phases.valueOf(phaseStr);
            PhaseState updated = phaseShiftService.updatePhase(newPhase);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid phase value"));
        }
    }
}
