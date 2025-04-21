package fi.lumos.javabackend.entity;


import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class Score {
    private int clarity;
    private int feasibility;
    private int impact;
    private int innovation;
    private int total;
}
