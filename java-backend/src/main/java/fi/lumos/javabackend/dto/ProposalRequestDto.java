package fi.lumos.javabackend.dto;


import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProposalRequestDto {


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


}
