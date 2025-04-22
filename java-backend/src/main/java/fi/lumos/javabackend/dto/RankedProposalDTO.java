package fi.lumos.javabackend.dto;

import fi.lumos.javabackend.entity.Proposal;
import fi.lumos.javabackend.entity.Score;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.stereotype.Component;


import java.lang.annotation.Documented;


@Getter
@Setter
@Component
@AllArgsConstructor
@NoArgsConstructor
public class RankedProposalDTO {

    private int rank;
    private Proposal proposal;
    private Score score;

}
