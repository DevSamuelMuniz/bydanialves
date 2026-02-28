import avatarMale from "@/assets/avatar-male.png";
import avatarFemale from "@/assets/avatar-female.png";

interface Avatar3DProps {
  name: string;
  blocked?: boolean;
  gender?: string;
}

export default function Avatar3D({ name, blocked, gender }: Avatar3DProps) {
  // fallback to name heuristic if gender not provided
  const resolvedGender = gender ?? inferGender(name);
  const src = resolvedGender === "female" ? avatarFemale : avatarMale;

  return (
    <div className={`h-20 w-20 rounded-full overflow-hidden flex items-center justify-center bg-muted border-2 ${blocked ? "border-destructive" : "border-primary/20"} transition-all`}>
      <img
        src={src}
        alt={resolvedGender === "female" ? "Avatar feminino" : "Avatar masculino"}
        className={`w-full h-full object-cover object-top transition-all duration-300 ${blocked ? "grayscale" : ""}`}
      />
    </div>
  );
}

function inferGender(name: string): "female" | "male" {
  const first = name.trim().split(" ")[0].toLowerCase();
  const femaleEndings = ["a", "inha", "ana", "ane", "ene", "ine", "ela", "ila", "ola", "ula", "alice", "iris", "ines", "inês", "es"];
  const maleNames = ["gabriel", "rafael", "miguel", "daniel", "samuel", "israel", "abel", "ezequiel", "raul", "saul", "naul"];
  if (maleNames.some((m) => first === m)) return "male";
  if (femaleEndings.some((e) => first.endsWith(e))) return "female";
  return "male";
}
