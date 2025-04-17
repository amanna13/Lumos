package fi.lumos.javabackend.controller;

import fi.lumos.javabackend.dto.ProposalRequestDto;
import fi.lumos.javabackend.entity.Proposal;
import fi.lumos.javabackend.repository.ProposalRepository;
import fi.lumos.javabackend.services.ProposalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/proposals")
public class ProposalRequestsController {

    @Autowired
    public ProposalRepository proposalRepository;

    @Autowired
    public ProposalService proposalService;

    @PostMapping("/submit")
    public ResponseEntity<Proposal> submitProposal(@RequestBody ProposalRequestDto proposalRequestDto) {
        Proposal proposal = proposalService.submitProposal(proposalRequestDto);
        return new ResponseEntity<>(proposal, HttpStatus.OK);
    }

    @GetMapping("/allproposals")
    public ResponseEntity<List<Proposal>> getAllProposals() {
        List<Proposal> proposalList=  proposalService.getAllProposals();

        return new ResponseEntity<>(proposalList, HttpStatus.OK);
    }
}
