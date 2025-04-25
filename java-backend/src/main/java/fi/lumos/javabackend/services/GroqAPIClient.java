package fi.lumos.javabackend.services;

import fi.lumos.javabackend.entity.Proposal;
import fi.lumos.javabackend.entity.ProposalScore;
import fi.lumos.javabackend.entity.Score;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

//This will be used to send the request to GROQ

@Component
public class GroqAPIClient {

    private final HttpClient client = HttpClient.newHttpClient();

    @Value("${api.key}")
    private String groqApiKey;

    public List<ProposalScore> sendBatch(List<Proposal> batch) {
        try {
            String prompt = buildPromptFromBatch(batch);

            JSONObject body = new JSONObject();
            body.put("model", "meta-llama/llama-4-scout-17b-16e-instruct"); // meta-llama/llama-4-scout-17b-16e-instruct
            body.put("temperature", 1);
            body.put("max_tokens", 1024);
            body.put("top_p", 1);
            body.put("stream", false);
            JSONArray messages = new JSONArray();

            messages.put(new JSONObject().put("role", "system")
                    .put("content", "You are an expert proposals grant evaluator. Your role is to critically and objectively review the following sections of a project proposal and assign scores across key evaluation dimensions. Evaluate the proposal strictly based on the content provided, without making assumptions or requiring additional context. Use the following criteria:\n" +
                            "\n" +
                            "clarity (On a Scale of 1–100): Evaluate how clearly and coherently the proposal conveys its purpose, goals, and plan.\n" +
                            "\n" +
                            "feasibility (On a Scale of 1–100): Assess the practicality and likelihood of successful execution based on the proposed objectives and budget.\n" +
                            "\n" +
                            "impact (On a Scale of 1–100): Judge the potential significance and benefit of the project’s outcomes for its target audience or domain.\n" +
                            "\n" +
                            "innovation (On a Scale of 1–100): Consider the originality, creativity, and forward-thinking nature of the proposed idea or approach.\n" +
                            "\n" +
                            "total (On a Scale of 1–100): Provide a comprehensive overall score on a scale of 1 to 100 that reflects your holistic assessment of the entire proposal." + "\n\n" +
                            "Respond in valid JSON array only inside triple backticks: ```[ {...}, {...} ]```    with no explanations or extra text"));

            messages.put(new JSONObject().put("role", "user").put("content", prompt));

            body.put("messages", messages);

            HttpRequest request = HttpRequest.newBuilder().uri(URI.create("https://api.groq.com/openai/v1/chat/completions")).header("Content-Type", "application/json").header("Authorization", "Bearer " + groqApiKey).POST(HttpRequest.BodyPublishers.ofString(body.toString())).build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                return parseResponse(response.body(), batch);
            } else {
                System.err.println("Groq API failed: " + response.body());
                return List.of();
            }

        } catch (Exception e) {
            e.printStackTrace();
            return List.of();
        }
    }

    private String buildPromptFromBatch(List<Proposal> batch) {
        StringBuilder sb = new StringBuilder();
        int i = 1;
        for (Proposal p : batch) {
            sb.append("Proposal: ").append(p.getId()).append(":\n")
                    .append("Title: ").append(p.getProjectTitle()).append("\n")
                    .append("Project Description: ").append(p.getProjectDescription()).append("\n")
                    .append("Summary: ").append(p.getBrief_summary()).append("\n")
                    .append("Primary Goal: ").append(p.getPrimaryGoal()).append("\n")
                    .append("Specific Objective: ").append(p.getSpecificObjective()).append("\n\n")
                    .append("Budget: ").append(p.getBudget().toString()).append("\n")
                    .append("Long Term Plan: ").append(p.getLongTermPlan()).append("\n")
                    .append("Future Funding Plans: ").append(p.getFutureFundingPlans()).append("\n\n");
        }
        sb.append("Please return JSON like this: [{proposalId:..., score: {clarity:..., feasibility:...,impact ..., innovation:..., total:...}}]");
        return sb.toString();
    }

    private List<ProposalScore> parseResponse(String body, List<Proposal> batch) {
        List<ProposalScore> scores = new ArrayList<>();
        try {
            // Assumes the Groq LLM returns a clean JSON array of objects
            String content = new JSONObject(body).getJSONArray("choices").getJSONObject(0).getJSONObject("message").getString("content");

//            System.out.println("🔍 Raw Groq content:\n" + content);

            String jsonArrayText = extractJsonBlock(content);
            JSONArray results = new JSONArray(jsonArrayText);
            for (int i = 0; i < results.length(); i++) {
                JSONObject entry = results.getJSONObject(i);

                ProposalScore score = new ProposalScore();

                String label = entry.get("proposalId").toString().trim();
//                int index = Integer.parseInt(label.replace("Proposal", "")) - 1;
//                long proposalId = Long.parseLong(label.replace("Proposal", "").trim());
                score.setProposalId(label);
//                score.setProposalId(batch.get(index).getId());

//                score.setEvaluatedAt(Instant.now());

                JSONObject scoreJson = entry.getJSONObject("score");
                Score s = new Score();
                s.setClarity(scoreJson.getInt("clarity"));
                s.setFeasibility(scoreJson.getInt("feasibility"));
                s.setImpact(scoreJson.getInt("impact"));
                s.setInnovation(scoreJson.getInt("innovation"));
                s.setTotal(scoreJson.getInt("total"));

                score.setScore(s);
                scores.add(score);
            }

        } catch (Exception e) {
            e.printStackTrace(); // fallback if response is not perfect
        }
        return scores;
    }

    private String extractJsonBlock(String content) {
        int start = content.indexOf("```json");
        if (start == -1) {
            start = content.indexOf("```"); // fallback if no 'json' tag
        }

        int end = content.lastIndexOf("```");

        if (start != -1 && end != -1 && start != end) {
            // Use +7 if it's ```json, otherwise +3
            int offset = content.startsWith("```json") ? 7 : 3;
            return content.substring(start + offset, end).trim();
        }

        throw new RuntimeException("Could not find JSON block in Groq response:\n" + content);
    }

}
