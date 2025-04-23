package fi.lumos.javabackend.controller;

import fi.lumos.javabackend.dto.RankedProposalDTO;
import fi.lumos.javabackend.entity.Proposal;
import fi.lumos.javabackend.entity.ProposalScore;
import fi.lumos.javabackend.repository.ProposalRepository;
import fi.lumos.javabackend.repository.ProposalScoreRepository;
import fi.lumos.javabackend.services.GroqEvaluation;
import fi.lumos.javabackend.services.ProposalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

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


//    @GetMapping("/rankings")
//    public ResponseEntity<List<ProposalScore>> getRankings() {
//        return new ResponseEntity<>(proposalScoreRepository.findAllByOrderByRankAsc(), HttpStatus.OK);
//    }


    @GetMapping("/rankings/top")
    public ResponseEntity<List<RankedProposalDTO>> getTopRankedProposals(@RequestParam(defaultValue = "10") int limit) {

        List<ProposalScore> topScores = proposalScoreRepository.findAllByOrderByRankAsc(PageRequest.of(0, limit));

        List<String> proposalIds = topScores.stream().map(ProposalScore::getProposalId).toList();

        Map<String, Proposal> proposalMap = proposalRepository.findAllById(proposalIds).stream().collect(Collectors.toMap(Proposal::getId, Function.identity()));

        List<RankedProposalDTO> rankedProposals = topScores.stream().map(proposalScore -> new RankedProposalDTO(proposalScore.getRank(), proposalMap.get(proposalScore.getProposalId()), proposalScore.getScore())).toList();

        return new ResponseEntity<>(rankedProposals, HttpStatus.OK);
    }

}
