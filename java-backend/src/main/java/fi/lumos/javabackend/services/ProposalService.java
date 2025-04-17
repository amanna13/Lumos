package fi.lumos.javabackend.services;

import fi.lumos.javabackend.dto.ProposalRequestDto;
import fi.lumos.javabackend.entity.Proposal;
import fi.lumos.javabackend.repository.ProposalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class ProposalService {

    @Autowired
    private ProposalRepository proposalRepository;



    public Proposal submitProposal(ProposalRequestDto proposalRequestDto) {
        Proposal proposal = new Proposal();
        proposal.setName(proposalRequestDto.getName());
        proposal.setEmailId(proposalRequestDto.getEmailId());
        proposal.setLinks(proposalRequestDto.getLinks());
        proposal.setProjectTitle(proposalRequestDto.getProjectTitle());
        proposal.setProjectDescription(proposalRequestDto.getProjectDescription());
        proposal.setBrief_summary(proposalRequestDto.getBrief_summary());
        proposal.setPrimaryGoal(proposalRequestDto.getPrimaryGoal());
        proposal.setSpecificObjective(proposalRequestDto.getSpecificObjective());
        proposal.setBudget(proposalRequestDto.getBudget());
        proposal.setLongTermPlan(proposalRequestDto.getLongTermPlan());
        proposal.setFutureFundingPlans(proposalRequestDto.getFutureFundingPlans());
        proposal.setStellarWalletAddress(proposalRequestDto.getStellarWalletAddress());
        proposal.setSubmittedAt(Instant.now());
        proposal.setStatus("Submitted");
        proposalRepository.save(proposal);


        return proposalRepository.save(proposal);
    }

    public List<Proposal> getAllProposals() {
        return proposalRepository.findAll();
    }

    public Optional<Proposal> getProposalById(String id) {
        return proposalRepository.findById(id);
    }

}
