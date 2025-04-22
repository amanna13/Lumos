package fi.lumos.javabackend.controller;


import fi.lumos.javabackend.dto.RankedProposalDTO;
import fi.lumos.javabackend.entity.Proposal;
import fi.lumos.javabackend.entity.ProposalScore;
import fi.lumos.javabackend.repository.ProposalRepository;
import fi.lumos.javabackend.repository.ProposalScoreRepository;
import fi.lumos.javabackend.services.GroqEvaluation;
import fi.lumos.javabackend.services.ProposalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
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

    @Autowired
    private ProposalService proposalService;


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


    @GetMapping("/rankings/top")
    public List<RankedProposalDTO> getTopRankedProposals(@RequestParam(defaultValue = "10") int limit) {
        List<ProposalScore> scores = proposalScoreRepository.findAll(Sort.by(Sort.Direction.ASC, "rank"));
        List<RankedProposalDTO> topRanked = new ArrayList<>();

        for (ProposalScore ps : scores) {
            proposalService.getProposalById(ps.getProposalId()).ifPresent(proposal -> {
                if (topRanked.size() < limit) {
                    topRanked.add(new RankedProposalDTO(ps.getRank(), proposal, ps.getScore()));
                }
            });
            if (topRanked.size() >= limit) break;
        }

        return topRanked;
    }

}
