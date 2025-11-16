'use client';

import { useState } from 'react';
import { useMusica } from '../hooks/useMusica';
import { useThemeByTime } from '../hooks/useThemeByTime';
import PageHeader from '../components/UI/PageHeader';
import SimpleCard from '../components/UI/Card';
import SimpleButton from '../components/UI/Button';
import {
  Music,
  AlertCircle,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  X,
  Link2,
  Loader,
} from 'lucide-react';

export default function MusicaPage() {
  const {
    estado,
    cambiarVolumen,
    reproducir,
    pausar,
    siguienteCancion,
    cancionAnterior,
    agregarCancion,
    eliminarCancion,
    seleccionarCancion,
  } = useMusica();

  const { colors } = useThemeByTime();
  const [urlYoutube, setUrlYoutube] = useState('');
  const [agregando, setAgregando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const handleAgregarCancion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!urlYoutube.trim()) {
      return;
    }

    try {
      setAgregando(true);
      await agregarCancion(urlYoutube, 'Usuario');
      setUrlYoutube('');
      setMostrarFormulario(false);
    } finally {
      setAgregando(false);
    }
  };

  const formatearTiempo = (segundos: number) => {
    const mins = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${mins}:${segs < 10 ? '0' : ''}${segs}`;
  };

  if (estado.cargando) {
    return (
      <div className={`p-4 md:p-6 pt-8 md:pt-4 space-y-6 font-inter ${colors.background} ${colors.text} transition-all duration-500`}>
        <PageHeader
          title="Música"
          icon={<Music className="w-8 md:w-10 h-8 md:h-10 text-white" />}
        />
        <div className="flex justify-center items-center min-h-96">
          <SimpleCard className="p-8 w-full max-w-md">
            <div className="text-center">
              <Loader className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
              <p className={`${colors.text} text-opacity-70`}>Cargando canciones...</p>
            </div>
          </SimpleCard>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 md:p-6 pt-8 md:pt-4 space-y-6 font-inter min-h-full ${colors.background} ${colors.text} transition-all duration-500`}>
      <PageHeader
        title="Música"
        icon={<Music className="w-8 md:w-10 h-8 md:h-10 text-white" />}
      />

      {estado.error && (
        <SimpleCard className={`p-4 border-l-4 border-red-500 ${colors.cardBg}`}>
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">{estado.error}</p>
          </div>
        </SimpleCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reproductor Principal */}
        <div className="lg:col-span-2">
          <SimpleCard className={`p-10 ${colors.cardBg}`}>
            {estado.cancionActual ? (
              <div className="space-y-8">
                {/* Visualizador de Audio */}
                <div className={`w-full h-64 rounded-3xl overflow-hidden flex items-center justify-center group backdrop-blur-sm border transition-all ${colors.cardBg === 'bg-gradient-to-br from-gray-900/80 via-purple-900/40 to-black/80' ? 'border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-pink-900/20' : 'border-white/10 bg-white/5'}`}>
                  {estado.estaReproduciendo ? (
                    <div className="flex items-center justify-center gap-2 h-full px-8">
                      {[...Array(18)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1.5 bg-gradient-to-t from-purple-400 via-pink-400 to-purple-300 rounded-full shadow-lg shadow-purple-500/50"
                          style={{
                            height: `${16 + Math.random() * 40}px`,
                            animation: `waveAnimation 0.6s ease-in-out infinite`,
                            animationDelay: `${i * 0.03}s`,
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30 flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <Music className="w-14 h-14 text-purple-300/60" />
                      </div>
                      <p className={`${colors.text} text-opacity-60 text-sm font-medium`}>En pausa</p>
                    </div>
                  )}
                </div>

                {/* Información de Canción */}
                <div className="space-y-4">
                  <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-200 via-pink-200 to-purple-200 tracking-tight leading-tight">
                    {estado.cancionActual.titulo}
                  </h2>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/60" />
                    <div>
                      <p className={`text-xl font-semibold ${colors.text}`}>
                        {estado.cancionActual.artista}
                      </p>
                      <p className={`text-sm ${colors.text} text-opacity-50`}>
                        Agregado por {estado.cancionActual.agregadoPor}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Barra de tiempo */}
                <div className="space-y-2">
                  <div className="relative group cursor-pointer">
                    <div className="w-full bg-gradient-to-r from-gray-700 to-gray-800 rounded-full h-1.5 shadow-inner overflow-hidden border border-purple-500/10">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 transition-all duration-100 shadow-lg shadow-purple-500/50"
                        style={{
                          width: `${estado.cancionActual ? (estado.tiempoActual / estado.cancionActual.duracion) * 100 : 0}%`,
                        }}
                      >
                        <div className="w-full h-full rounded-full animate-pulse" />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs font-mono px-1">
                    <span className={`${colors.text} text-opacity-40`}>{formatearTiempo(estado.tiempoActual)}</span>
                    <span className={`${colors.text} text-opacity-40`}>
                      {estado.cancionActual
                        ? formatearTiempo(estado.cancionActual.duracion)
                        : '0:00'}
                    </span>
                  </div>
                </div>

                {/* Controles de reproducción con volumen a la derecha */}
                <div className="flex justify-between items-center">
                  {/* Izquierda - Controles */}
                  <div className="flex-1" />
                  
                  <div className="flex items-center gap-10">
                    <button
                      onClick={cancionAnterior}
                      disabled={estado.cola.length === 0}
                      className="text-gray-400 hover:text-purple-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-125 transform p-3 rounded-full hover:bg-white/5"
                    >
                      <SkipBack size={32} />
                    </button>

                    <button
                      onClick={estado.estaReproduciendo ? pausar : reproducir}
                      className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 shadow-2xl shadow-purple-500/60 border border-purple-300/40 flex items-center justify-center text-white transition-all active:scale-90 hover:scale-110 transform hover:shadow-purple-500/80"
                    >
                      {estado.estaReproduciendo ? (
                        <Pause size={36} />
                      ) : (
                        <Play size={36} className="ml-1" />
                      )}
                    </button>

                    <button
                      onClick={siguienteCancion}
                      disabled={estado.cola.length === 0}
                      className="text-gray-400 hover:text-purple-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-125 transform p-3 rounded-full hover:bg-white/5"
                    >
                      <SkipForward size={32} />
                    </button>
                  </div>

                  {/* Derecha - Volumen */}
                  <div className="flex-1 flex justify-end">
                    <div className="flex items-center gap-3 pr-2">
                      <Volume2 className="text-purple-400 flex-shrink-0" size={24} />
                      <div className="relative group flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={estado.volumen}
                          onChange={(e) => cambiarVolumen(Number(e.target.value))}
                          className="w-28 h-2 bg-gradient-to-r from-gray-700 to-gray-800 rounded-full cursor-pointer appearance-none accent-purple-500 shadow-inner border border-purple-500/10 transition-all"
                          style={{
                            backgroundImage: `linear-gradient(to right, rgb(168, 85, 247), rgb(236, 72, 153), rgb(168, 85, 247))`,
                            backgroundSize: `${estado.volumen}% 100%`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: '0 0',
                          }}
                        />
                        <span className="text-sm font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent w-10 text-right">
                          {estado.volumen}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30 flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                    <Music className="w-12 h-12 text-purple-400/60" />
                  </div>
                  <p className={`${colors.text} text-lg font-semibold mb-2`}>No hay canciones en la cola</p>
                  <p className={`${colors.text} text-opacity-50 text-sm`}>Agrega una canción de YouTube para comenzar</p>
                </div>
              </div>
            )}
          </SimpleCard>
        </div>

        {/* Panel Lateral - Solo Essentials */}
        <div className="lg:col-span-1 space-y-4">
          {/* Botón Agregar */}
          <SimpleButton
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            className="w-full !py-4 !text-base !font-bold flex items-center justify-center gap-2"
            active={mostrarFormulario}
          >
            <Plus size={20} />
            Agregar Música
          </SimpleButton>

          {/* Formulario */}
          {mostrarFormulario && (
            <SimpleCard className={`p-6 ${colors.cardBg} space-y-3`}>
              <form onSubmit={handleAgregarCancion} className="space-y-3">
                <div className="relative group">
                  <input
                    type="url"
                    placeholder="Pega tu enlace de YouTube"
                    value={urlYoutube}
                    onChange={(e) => setUrlYoutube(e.target.value)}
                    disabled={agregando}
                    className={`w-full ${colors.cardBg} text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-600 text-sm border border-purple-500/20 disabled:opacity-50 transition-all backdrop-blur-sm`}
                  />
                  <Link2 className="absolute right-3 top-3.5 w-4 h-4 text-gray-600 group-focus-within:text-purple-400 transition-colors" />
                </div>

                <SimpleButton
                  onClick={handleAgregarCancion}
                  className="w-full !py-3 !text-sm"
                  active={true}
                >
                  {agregando ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader size={16} className="animate-spin" />
                      Agregando...
                    </span>
                  ) : (
                    'Agregar'
                  )}
                </SimpleButton>
              </form>
            </SimpleCard>
          )}

          {/* Cola de reproducción */}
          <SimpleCard className={`p-6 ${colors.cardBg} flex flex-col h-fit`}>
            <h3 className={`text-sm font-bold ${colors.text} mb-4 uppercase tracking-widest`}>
              Cola <span className="text-purple-400 font-bold ml-1">({estado.cola.length})</span>
            </h3>
            <div className="space-y-2">
              {estado.cola.length > 0 ? (
                estado.cola.map((cancion, index) => (
                  <div
                    key={cancion.id}
                    onClick={() => seleccionarCancion(cancion.id)}
                    className={`p-3 rounded-lg transition-all cursor-pointer border-l-3 group ${
                      estado.cancionActual?.id === cancion.id
                        ? 'bg-purple-600/30 border-purple-500 shadow-lg shadow-purple-500/20'
                        : `${colors.cardBg} border-transparent hover:bg-white/5 hover:border-purple-500/50`
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`${colors.text} font-semibold text-sm truncate group-hover:text-purple-300 transition-colors`}>
                          <span className="text-purple-300">{index + 1}.</span> {cancion.titulo}
                        </p>
                        <p className={`${colors.text} text-opacity-50 text-xs truncate mt-0.5`}>
                          {cancion.artista}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarCancion(cancion.id);
                        }}
                        className={`${colors.text} text-opacity-50 hover:text-red-400 transition-colors flex-shrink-0 hover:scale-110 transform opacity-0 group-hover:opacity-100`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-24">
                  <p className={`text-center ${colors.text} text-opacity-50 text-xs`}>
                    La cola está vacía
                  </p>
                </div>
              )}
            </div>
          </SimpleCard>
        </div>
      </div>
    </div>
  );
}

const Plus = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);