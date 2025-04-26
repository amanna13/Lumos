package fi.lumos.javabackend.repository;

import fi.lumos.javabackend.entity.PhaseState;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PhaseShiftTrackingRepository extends MongoRepository<PhaseState, String> {
    PhaseState findTopByOrderByUpdatedAtDesc();
}
