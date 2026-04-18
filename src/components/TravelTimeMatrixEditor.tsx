import type { Theater, TravelTime } from "../domain/types";

interface TravelTimeMatrixEditorProps {
  theaters: Theater[];
  travelTimes: TravelTime[];
  onChange: (travelTimes: TravelTime[]) => void;
}

function getTravelMinutes(
  travelTimes: TravelTime[],
  fromTheaterId: string,
  toTheaterId: string,
): number {
  if (fromTheaterId === toTheaterId) {
    return 0;
  }

  const direct = travelTimes.find(
    (travelTime) =>
      travelTime.fromTheaterId === fromTheaterId && travelTime.toTheaterId === toTheaterId,
  );
  if (direct) {
    return direct.travelMinutes;
  }

  const reverse = travelTimes.find(
    (travelTime) =>
      travelTime.fromTheaterId === toTheaterId && travelTime.toTheaterId === fromTheaterId,
  );
  return reverse?.travelMinutes ?? 0;
}

export function TravelTimeMatrixEditor(props: TravelTimeMatrixEditorProps) {
  const { theaters, travelTimes, onChange } = props;

  function updateValue(fromTheaterId: string, toTheaterId: string, value: number): void {
    const next = travelTimes.filter(
      (travelTime) =>
        !(
          travelTime.fromTheaterId === fromTheaterId && travelTime.toTheaterId === toTheaterId
        ),
    );
    next.push({
      fromTheaterId,
      toTheaterId,
      travelMinutes: Math.max(0, value),
    });
    onChange(next);
  }

  return (
    <section className="panel">
      <h2>映画館間の移動時間</h2>
      <div className="table-wrap">
        <table className="matrix-table">
          <thead>
            <tr>
              <th>from / to</th>
              {theaters.map((theater) => (
                <th key={theater.id}>{theater.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {theaters.map((fromTheater) => (
              <tr key={fromTheater.id}>
                <th>{fromTheater.name}</th>
                {theaters.map((toTheater) => {
                  const disabled = fromTheater.id === toTheater.id;
                  return (
                    <td key={toTheater.id}>
                      <input
                        type="number"
                        min={0}
                        disabled={disabled}
                        value={getTravelMinutes(travelTimes, fromTheater.id, toTheater.id)}
                        onChange={(event) =>
                          updateValue(fromTheater.id, toTheater.id, Number(event.target.value))
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
