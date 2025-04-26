package fi.lumos.javabackend.services;

import fi.lumos.javabackend.entity.PhaseState;
import fi.lumos.javabackend.enums.Phases;
import fi.lumos.javabackend.repository.PhaseShiftTrackingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class PhaseShiftService {

    @Autowired
    public PhaseShiftTrackingRepository phaseShiftTrackingRepository;

    public PhaseState getPhaseShift() {
        return phaseShiftTrackingRepository.findTopByOrderByUpdatedAtDesc();
    }

    public PhaseState updatePhase(Phases newPhase){
        PhaseState state = new PhaseState(newPhase, Instant.now());
        return phaseShiftTrackingRepository.save(state);
    }

}
