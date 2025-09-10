import { useState } from "react";
import Login from "./login";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState("Inicio");

  // Estados
  const [lightOn, setLightOn] = useState(false);
  const [temperature, setTemperature] = useState(22);
  const [humidity, setHumidity] = useState(50);
  const [securityOn, setSecurityOn] = useState(false);
  const [energyUsage, setEnergyUsage] = useState(350);
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState("");

  // Datos de ejemplo
  const dispositivos = [
    { nombre: "Televisor", categoria: "Entretenimiento", estado: "Encendido" },
    { nombre: "Refrigeradora", categoria: "Electrodomésticos", estado: "Operativa" },
    { nombre: "Router", categoria: "Red", estado: "Conectado" },
    { nombre: "PC", categoria: "Oficina", estado: "Apagada" },
  ];

  const camaras = [
    { nombre: "Sala", tipo: "Interior" },
    { nombre: "Cocina", tipo: "Interior" },
    { nombre: "Jardín", tipo: "Exterior" },
    { nombre: "Garaje", tipo: "Exterior" },
  ];

  const sensores = [
    { nombre: "Sensor Puerta", estado: "Activo" },
    { nombre: "Sensor Ventana", estado: "Inactivo" },
    { nombre: "Detector Movimiento", estado: "Activo" },
  ];

  const enchufes = [
    { nombre: "Cargador Teléfono", estado: "Encendido" },
    { nombre: "Lámpara", estado: "Apagado" },
    { nombre: "Consola", estado: "Encendido" },
  ];

  // Filtros
  const [filtroDispositivo, setFiltroDispositivo] = useState("Todos");
  const [filtroCamara, setFiltroCamara] = useState("Todos");
  const [filtroSensor, setFiltroSensor] = useState("Todos");
  const [filtroEnchufe, setFiltroEnchufe] = useState("Todos");

  // Chat
  const handleSendMessage = () => {
    if (chatInput.trim() !== "") {
      setChatMessages([...chatMessages, `👤 Dueño: ${chatInput}`]);
      setChatInput("");
      // Simulación de respuesta automática
      setTimeout(() => {
        setChatMessages((msgs) => [...msgs, "🤖 Casa: Recibí tu mensaje."]);
      }, 1000);
    }
  };

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#141E30] to-[#243B55] text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-black/40 backdrop-blur-md p-6 flex flex-col">
        <h1 className="text-2xl font-bold mb-8 text-center">🏠 Smart Home</h1>
        <nav className="flex flex-col gap-3">
          {[
            "Inicio",
            "Dispositivos",
            "Seguridad",
            "Monitoreo",
            "Energía",
            "Chat",
            "Configuración",
          ].map((item) => (
            <button
              key={item}
              onClick={() => setSelectedMenu(item)}
              className={`px-4 py-2 rounded-lg text-left transition ${
                selectedMenu === item
                  ? "bg-white/20 font-bold"
                  : "hover:bg-white/10"
              }`}
            >
              {item}
            </button>
          ))}
          <button
            onClick={() => setIsLoggedIn(false)}
            className="mt-10 bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg font-bold"
          >
            Cerrar Sesión
          </button>
        </nav>
      </aside>

      {/* Contenido dinámico */}
      <main className="flex-1 p-8 flex justify-center items-start">
        <div className="w-full max-w-5xl">
          {/* Inicio */}
          {selectedMenu === "Inicio" && (
            <div className="text-center mt-20">
              <h2 className="text-3xl font-bold mb-4">
                Bienvenido a tu Casa Inteligente
              </h2>
              <p className="text-lg text-white/80">
                Selecciona una opción del menú para controlar tus dispositivos y
                ver el estado de tu hogar.
              </p>
            </div>
          )}

          {/* Dispositivos */}
          {selectedMenu === "Dispositivos" && (
            <div>
              <h2 className="text-2xl font-bold mb-6">📱 Dispositivos</h2>
              <select
                className="mb-6 p-2 rounded bg-white/20"
                value={filtroDispositivo}
                onChange={(e) => setFiltroDispositivo(e.target.value)}
              >
                <option>Todos</option>
                <option>Entretenimiento</option>
                <option>Electrodomésticos</option>
                <option>Red</option>
                <option>Oficina</option>
              </select>
              <ul className="space-y-3">
                {dispositivos
                  .filter(
                    (d) =>
                      filtroDispositivo === "Todos" ||
                      d.categoria === filtroDispositivo
                  )
                  .map((d, idx) => (
                    <li
                      key={idx}
                      className="p-4 bg-white/10 rounded-lg flex justify-between"
                    >
                      {d.nombre} - {d.estado}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Seguridad */}
          {selectedMenu === "Seguridad" && (
            <div>
              <h2 className="text-2xl font-bold mb-6">🔒 Seguridad</h2>

              {/* Estado alarma */}
              <div className="mb-8 flex flex-col items-center">
                <div
                  className={`w-24 h-24 flex items-center justify-center rounded-full mb-4 transition ${
                    securityOn ? "bg-green-500" : "bg-gray-600"
                  }`}
                >
                  {securityOn ? "ON" : "OFF"}
                </div>
                <button
                  onClick={() => setSecurityOn(!securityOn)}
                  className={`px-6 py-2 rounded-xl font-bold transition ${
                    securityOn
                      ? "bg-red-500 hover:bg-red-400"
                      : "bg-green-500 hover:bg-green-400"
                  }`}
                >
                  {securityOn ? "Desactivar Alarma" : "Activar Alarma"}
                </button>
              </div>

              {/* Cámaras */}
              <h3 className="text-xl font-semibold mb-3">📷 Cámaras</h3>
              <select
                className="mb-4 p-2 rounded bg-white/20"
                value={filtroCamara}
                onChange={(e) => setFiltroCamara(e.target.value)}
              >
                <option>Todos</option>
                <option>Interior</option>
                <option>Exterior</option>
              </select>
              <ul className="space-y-3 mb-6">
                {camaras
                  .filter(
                    (c) =>
                      filtroCamara === "Todos" || c.tipo === filtroCamara
                  )
                  .map((c, idx) => (
                    <li
                      key={idx}
                      className="p-4 bg-white/10 rounded-lg flex justify-between"
                    >
                      {c.nombre} - {c.tipo}
                    </li>
                  ))}
              </ul>

              {/* Sensores */}
              <h3 className="text-xl font-semibold mb-3">🛑 Sensores</h3>
              <select
                className="mb-4 p-2 rounded bg-white/20"
                value={filtroSensor}
                onChange={(e) => setFiltroSensor(e.target.value)}
              >
                <option>Todos</option>
                <option>Activo</option>
                <option>Inactivo</option>
              </select>
              <ul className="space-y-3">
                {sensores
                  .filter(
                    (s) =>
                      filtroSensor === "Todos" || s.estado === filtroSensor
                  )
                  .map((s, idx) => (
                    <li
                      key={idx}
                      className="p-4 bg-white/10 rounded-lg flex justify-between"
                    >
                      {s.nombre} - {s.estado}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Monitoreo */}
          {selectedMenu === "Monitoreo" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Luz */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-lg p-6 flex flex-col items-center">
                <h2 className="text-xl font-semibold mb-4">💡 Luz</h2>
                <div
                  className={`w-20 h-20 rounded-full mb-6 transition ${
                    lightOn
                      ? "bg-yellow-400 shadow-lg shadow-yellow-300"
                      : "bg-gray-700"
                  }`}
                ></div>
                <button
                  onClick={() => setLightOn(!lightOn)}
                  className={`w-full py-2 rounded-xl font-bold transition ${
                    lightOn
                      ? "bg-red-500 hover:bg-red-400"
                      : "bg-green-500 hover:bg-green-400"
                  }`}
                >
                  {lightOn ? "Apagar" : "Encender"}
                </button>
              </div>

              {/* Temperatura */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-lg p-6 flex flex-col items-center">
                <h2 className="text-xl font-semibold mb-4">🌡️ Temperatura</h2>
                <p className="text-5xl font-bold mb-6">{temperature}°C</p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setTemperature(temperature - 1)}
                    className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 transition text-xl font-bold"
                  >
                    -
                  </button>
                  <button
                    onClick={() => setTemperature(temperature + 1)}
                    className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-400 transition text-xl font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Humedad */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-lg p-6 flex flex-col items-center">
                <h2 className="text-xl font-semibold mb-4">💧 Humedad</h2>
                <p className="text-5xl font-bold mb-6">{humidity}%</p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setHumidity(humidity - 1)}
                    className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 transition text-xl font-bold"
                  >
                    -
                  </button>
                  <button
                    onClick={() => setHumidity(humidity + 1)}
                    className="px-5 py-2 rounded-xl bg-green-500 hover:bg-green-400 transition text-xl font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Energía */}
          {selectedMenu === "Energía" && (
            <div>
              <h2 className="text-2xl font-bold mb-6">⚡ Energía</h2>
              <p className="mb-6 text-lg">
                Consumo actual:{" "}
                <span className="font-bold">{energyUsage} W</span>
              </p>
              <select
                className="mb-6 p-2 rounded bg-white/20"
                value={filtroEnchufe}
                onChange={(e) => setFiltroEnchufe(e.target.value)}
              >
                <option>Todos</option>
                <option>Encendido</option>
                <option>Apagado</option>
              </select>
              <ul className="space-y-3">
                {enchufes
                  .filter(
                    (e) =>
                      filtroEnchufe === "Todos" || e.estado === filtroEnchufe
                  )
                  .map((e, idx) => (
                    <li
                      key={idx}
                      className="p-4 bg-white/10 rounded-lg flex justify-between"
                    >
                      {e.nombre} - {e.estado}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Chat */}
          {selectedMenu === "Chat" && (
            <div className="flex flex-col h-[70vh]">
              <h2 className="text-2xl font-bold mb-6">💬 Chat con tu Casa</h2>
              <div className="flex-1 bg-white/10 rounded-lg p-4 overflow-y-auto space-y-2">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg ${
                      msg.startsWith("👤")
                        ? "bg-blue-500 text-white self-end"
                        : "bg-green-500 text-white self-start"
                    }`}
                  >
                    {msg}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex">
                <input
                  type="text"
                  className="flex-1 p-2 rounded-l-lg bg-white/20"
                  placeholder="Escribe un mensaje..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                />
                <button
                  onClick={handleSendMessage}
                  className="px-6 bg-blue-500 hover:bg-blue-400 rounded-r-lg"
                >
                  Enviar
                </button>
              </div>
            </div>
          )}

          {/* Configuración */}
          {selectedMenu === "Configuración" && (
            <div>
              <h2 className="text-2xl font-bold mb-6">⚙️ Configuración</h2>
              <p className="text-white/80">
                Aquí podrás ajustar las preferencias de tu sistema.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
