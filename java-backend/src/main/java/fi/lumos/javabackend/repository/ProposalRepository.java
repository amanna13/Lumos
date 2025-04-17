package fi.lumos.javabackend.repository;

import fi.lumos.javabackend.entity.Proposal;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface ProposalRepository extends MongoRepository<Proposal, String> {

    Optional<Proposal> findByStatus(String status);

}
