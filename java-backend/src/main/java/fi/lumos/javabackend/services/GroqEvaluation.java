package fi.lumos.javabackend.services;

import fi.lumos.javabackend.entity.Proposal;
import fi.lumos.javabackend.entity.ProposalScore;
import fi.lumos.javabackend.repository.ProposalScoreRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class GroqEvaluation {

    @Autowired
    public GroqAPIClient groqAPIService;

    @Autowired private WebSocketProgressSender progressSender;

    @Autowired
    public ProposalScoreRepository proposalScoreRepository;


    public void processProposals(List<Proposal> proposals) {
        int batchsize = 5;
        List<List<Proposal>> batches = splitIntoBatches(proposals, batchsize);
        int total_batches = batches.size();

        AtomicInteger completed  = new AtomicInteger(0);

        for (List<Proposal> batch : batches) {
            processBatchAsync(batch, completed, total_batches);
        }

    }


    @Async
    public void processBatchAsync(List<Proposal> batch, AtomicInteger completed, int total) {
        List<ProposalScore> scores = groqAPIService.sendBatch(batch);

        // Save scores to MongoDB
        proposalScoreRepository.saveAll(scores);

        int finished = completed.incrementAndGet();
        int progress = (int) (((double) completed.incrementAndGet() / total) * 100);
        progressSender.sendProgress(progress);

        if (finished == total) {
            rankProposals();
        }
    }


    public List<List<Proposal>> splitIntoBatches(List<Proposal> proposals, int batchSize) {
        List<List<Proposal>> batches = new ArrayList<>();
        for (int i = 0; i < proposals.size(); i += batchSize) {
            int end = Math.min(i + batchSize, proposals.size());
            batches.add(proposals.subList(i, end));
        }
        return batches;
    }



    public void rankProposals() {
        List<ProposalScore> all = proposalScoreRepository.findAll();

        // Sort by total, tie-breaker: clarity, then feasibility
        all.sort((a, b) -> {
            int cmp = Integer.compare(b.getScore().getTotal(), a.getScore().getTotal());
            if (cmp == 0) cmp = Integer.compare(b.getScore().getClarity(), a.getScore().getClarity());
            if (cmp == 0) cmp = Integer.compare(b.getScore().getFeasibility(), a.getScore().getFeasibility());
            return cmp;
        });

        // Assign Ranking
        for (int i = 0; i < all.size(); i++) {
            all.get(i).setRank(i + 1);
//            System.out.println("Rank " + (i + 1) + ": " + p.getProposalId() + " → Total Score: " + p.getScore().getTotal());
        }

        proposalScoreRepository.saveAll(all);
    }


}
