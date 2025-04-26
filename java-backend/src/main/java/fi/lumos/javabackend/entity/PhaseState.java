package fi.lumos.javabackend.entity;


import com.fasterxml.jackson.annotation.JsonIgnore;
import fi.lumos.javabackend.enums.Phases;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Document(collection = "Phase_Tracking")
public class PhaseState {
    @Id
    @JsonIgnore
    private String id;

    private String currentPhase;
    private Instant updatedAt;

    public PhaseState(Phases newPhase, Instant now) {
        this.currentPhase = newPhase.name();
        this.updatedAt = now;
    }
}
