package fi.lumos.javabackend.repository;

import fi.lumos.javabackend.entity.ProposalScore;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ProposalScoreRepository extends MongoRepository<ProposalScore, String> {
    Optional<ProposalScore> findByProposalId(String proposalId);
    List<ProposalScore> findAllByOrderByRankAsc();
}
