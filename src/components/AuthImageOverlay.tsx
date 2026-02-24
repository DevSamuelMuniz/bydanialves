import { Scissors, Calendar, Star, Clock } from "lucide-react";
import logo from "@/assets/logo-dani-alves.jpg";

interface AuthImageOverlayProps {
  imageSrc: string;
}

export function AuthImageOverlay({ imageSrc }: AuthImageOverlayProps) {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative flex-col">
      <img src={imageSrc} alt="Salão de beleza" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />
      
      {/* Logo */}
      <div className="relative z-10 p-8">
        <img src={logo} alt="Dani Alves" className="h-16 w-16 rounded-full object-cover border-2 border-white/30 shadow-lg" />
      </div>

      {/* Content */}
      <div className="relative z-10 mt-auto p-10 space-y-6">
        <h2 className="font-serif text-3xl font-bold text-white tracking-tight">
          ESMALTERIA DANIELLA ALVES
        </h2>
        <p className="text-white/80 text-base leading-relaxed max-w-sm">
          Transforme seu visual com profissionais especializados. Agende online e aproveite uma experiência única.
        </p>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Scissors className="h-5 w-5 text-primary" />
            </div>
            <span className="text-white/90 text-sm">Cortes exclusivos</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <span className="text-white/90 text-sm">Agendamento fácil</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Star className="h-5 w-5 text-primary" />
            </div>
            <span className="text-white/90 text-sm">Profissionais top</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <span className="text-white/90 text-sm">Horários flexíveis</span>
          </div>
        </div>
      </div>
    </div>
  );
}
