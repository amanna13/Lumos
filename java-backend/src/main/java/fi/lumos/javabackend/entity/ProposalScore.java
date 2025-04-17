package fi.lumos.javabackend.entity;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Getter
@Setter
@Document(collection = "proposal_scores")
public class ProposalScore {
    @Id
    private String id;

    private String proposalId;
    private Score score;
    private Instant evaluatedAt;
    private String evaluatedBy;

}
