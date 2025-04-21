package fi.lumos.javabackend.controller;


import fi.lumos.javabackend.entity.Proposal;
import fi.lumos.javabackend.entity.ProposalScore;
import fi.lumos.javabackend.repository.ProposalRepository;
import fi.lumos.javabackend.repository.ProposalScoreRepository;
import fi.lumos.javabackend.services.GroqEvaluation;
import fi.lumos.javabackend.services.ProposalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/evaluation")
public class ProposalEvaluationController {

    @Autowired
    private ProposalRepository proposalRepository;

    @Autowired
    private ProposalScoreRepository proposalScoreRepository;

    @Autowired
    private GroqEvaluation groqEvaluation;


    @PostMapping("/start")
    public ResponseEntity<String> evaluateAll() {
        List<Proposal> proposals = proposalRepository.findAll();
        if (proposals.isEmpty()) {
            return new ResponseEntity<>("No proposals found to evaluate.", HttpStatus.NO_CONTENT);
        }

        groqEvaluation.processProposals(proposals);
        return new ResponseEntity<>("Evaluation started for " + proposals.size() + " proposals.", HttpStatus.ACCEPTED);
    }


    @GetMapping("/rankings")
    public ResponseEntity<List<ProposalScore>> getRankings() {
        return new ResponseEntity<>(proposalScoreRepository.findAllByOrderByRankAsc(), HttpStatus.OK);
    }
}
