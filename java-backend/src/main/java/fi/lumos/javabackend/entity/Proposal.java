package fi.lumos.javabackend.entity;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Getter
@Setter
@Component
@Document(collection = "proposal_submissions")
public class Proposal {

    @Id
    private String id;

    private String name;
    private String emailId;
    private String links;

    private String projectTitle;
    private String projectDescription;
    private String brief_summary;

    private String primaryGoal;
    private String specificObjective;

    private String budget;

    private String longTermPlan;
    private String futureFundingPlans;

    private String stellarWalletAddress;

    private Instant submittedAt;
    private String status;

}
