import { useState, useEffect } from "react";
import Login from "./login";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState("Inicio");

  // Estados generales
  const [lightOn, setLightOn] = useState(false);
  const [temperature, setTemperature] = useState(22);
  const [humidity, setHumidity] = useState(50);
  const [securityOn, setSecurityOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [energyUsage, setEnergyUsage] = useState(320);

  // Dispositivos
  const [devices, setDevices] = useState([
    { name: "Televisor", on: true },
    { name: "Refrigeradora", on: true },
    { name: "Router", on: true },
    { name: "Aspiradora", on: false },
  ]);
  const [filter, setFilter] = useState("Todos");

  // Chat
  const [messages, setMessages] = useState([
    { sender: "Casa", text: "Bienvenido, el sistema está operativo ✅" },
  ]);
  const [newMessage, setNewMessage] = useState("");

  const sendMessage = () => {
    if (newMessage.trim() !== "") {
      setMessages([...messages, { sender: "Dueño", text: newMessage }]);
      setNewMessage("");
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { sender: "Casa", text: "Mensaje recibido, ejecutando revisión 🔍" },
        ]);
      }, 1000);
    }
  };

  // Configuración
  const [ownerName, setOwnerName] = useState("usuario");
  const [language, setLanguage] = useState("es");
  const [notifications, setNotifications] = useState(true);

  // 🔥 Tema dinámico según la hora del día
  type Theme = "morning" | "afternoon" | "night";
  const [theme, setTheme] = useState<Theme>("night");

  useEffect(() => {
    const updateTheme = () => {
      const hour = new Date().getHours();
      if (hour >= 6 && hour < 12) setTheme("morning");
      else if (hour >= 12 && hour < 18) setTheme("afternoon");
      else setTheme("night");
    };

    updateTheme();
    const interval = setInterval(updateTheme, 60000);
    return () => clearInterval(interval);
  }, []);

  // 🎨 Fondos según tema
  const themeClasses = {
    morning:
      "bg-gradient-to-br from-blue-200 via-yellow-100 to-blue-300 text-black",
    afternoon:
      "bg-gradient-to-br from-orange-200 via-pink-200 to-purple-300 text-black",
    night:
      "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white",
  };

  // 🕒 Reloj y clima
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [timeParts, setTimeParts] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [weather, setWeather] = useState({
    condition: "☀️ Soleado",
    temp: 24,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString("es-ES"));
      setDate(
        now.toLocaleDateString("es-ES", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
      setTimeParts({
        hours: now.getHours(),
        minutes: now.getMinutes(),
        seconds: now.getSeconds(),
      });

      if (now.getSeconds() === 0) {
        const conditions = [
          { condition: "☀️ Soleado", temp: 26 },
          { condition: "🌧️ Lluvia", temp: 18 },
          { condition: "⛅ Parcial", temp: 22 },
          { condition: "❄️ Nevado", temp: -2 },
        ];
        setWeather(conditions[Math.floor(Math.random() * conditions.length)]);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 📊 Datos del gráfico
  const [chartData, setChartData] = useState<
    { time: string; Temperatura: number; Humedad: number; Energía: number }[]
  >([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const newData = {
        time: now.toLocaleTimeString("es-ES"),
        Temperatura: temperature + Math.floor(Math.random() * 3 - 1),
        Humedad: humidity + Math.floor(Math.random() * 3 - 1),
        Energía: energyUsage + Math.floor(Math.random() * 5 - 2),
      };
      setChartData((prev) => [...prev.slice(-19), newData]);
    }, 3000);

    return () => clearInterval(interval);
  }, [temperature, humidity, energyUsage]);

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div
      className={`min-h-screen flex relative overflow-hidden transition-colors duration-1000 ${themeClasses[theme]}`}
    >
      {/* Fondo animado */}
      <div className="absolute inset-0 z-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 animate-pulse"></div>
      </div>

      {/* Sidebar */}
      <aside
        className={`relative z-10 w-72 ${
          theme === "night"
            ? "bg-black/50 text-white"
            : "bg-white/60 text-black"
        } shadow-2xl backdrop-blur-lg p-6 flex flex-col border-r border-cyan-500/30`}
      >
        <h1 className="text-3xl font-extrabold mb-8 text-center bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent drop-shadow">
          🏠 Smart Home
        </h1>
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
              className={`px-4 py-2 rounded-lg text-left transition-all duration-300 ${
                selectedMenu === item
                  ? "bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold shadow-lg scale-105"
                  : "hover:bg-cyan-500/20 hover:scale-105"
              }`}
            >
              {item}
            </button>
          ))}
          <button
            onClick={() => setIsLoggedIn(false)}
            className="mt-10 bg-gradient-to-r from-red-600 to-red-400 hover:scale-105 px-4 py-2 rounded-lg font-bold shadow-lg transition"
          >
            Cerrar Sesión
          </button>
        </nav>
      </aside>

      {/* Contenido dinámico */}
      <main className="relative z-10 flex-1 p-8 overflow-y-auto space-y-10">
        {/* Inicio */}
        {selectedMenu === "Inicio" && (
          <div>
            <h2 className="text-5xl font-extrabold mb-8 text-center bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Bienvenido, {ownerName} 🚀
            </h2>

            {/* Reloj Futurista */}
            <div className="bg-black/50 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-8 mb-10 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Digital */}
              <div className="text-center md:text-left">
                <h3 className="text-6xl font-bold text-cyan-400 drop-shadow-lg">
                  {time}
                </h3>
                <p className="text-gray-300 mt-2 text-lg">{date}</p>
                <p className="mt-3 text-purple-300 font-semibold text-xl">
                  Clima: {weather.condition} | 🌡 {weather.temp}°C
                </p>
              </div>

              {/* Analógico */}
              <div className="relative w-48 h-48 rounded-full border-4 border-cyan-500 flex items-center justify-center shadow-cyan-500/50 shadow-lg">
                <div
                  className="absolute w-1 h-16 bg-cyan-400 origin-bottom"
                  style={{ transform: `rotate(${timeParts.seconds * 6}deg)` }}
                />
                <div
                  className="absolute w-2 h-14 bg-purple-400 origin-bottom"
                  style={{ transform: `rotate(${timeParts.minutes * 6}deg)` }}
                />
                <div
                  className="absolute w-3 h-10 bg-pink-500 origin-bottom"
                  style={{ transform: `rotate(${timeParts.hours * 30}deg)` }}
                />
                <div className="absolute w-4 h-4 bg-white rounded-full"></div>
              </div>
            </div>

            {/* Resumen general */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-black/40 p-6 rounded-xl shadow-lg border border-cyan-500/30">
                <h3 className="text-xl font-bold mb-2">🌡 Temperatura</h3>
                <p className="text-2xl">{temperature}°C</p>
              </div>
              <div className="bg-black/40 p-6 rounded-xl shadow-lg border border-purple-500/30">
                <h3 className="text-xl font-bold mb-2">💧 Humedad</h3>
                <p className="text-2xl">{humidity}%</p>
              </div>
              <div className="bg-black/40 p-6 rounded-xl shadow-lg border border-pink-500/30">
                <h3 className="text-xl font-bold mb-2">⚡ Energía</h3>
                <p className="text-2xl">{energyUsage} kWh</p>
              </div>
            </div>

            {/* Gráfico general mejorado */}
            <div className="mt-10 bg-black/40 p-6 rounded-xl shadow-lg border border-cyan-500/30">
              <h3 className="text-2xl font-bold mb-4">📊 Estado General</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <defs>
                      <linearGradient id="temp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="hum" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="ene" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ec4899" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#ec4899" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="time" stroke="#aaa" />
                    <YAxis stroke="#aaa" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(20,20,20,0.9)",
                        border: "1px solid #555",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Temperatura"
                      stroke="url(#temp)"
                      strokeWidth={3}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Humedad"
                      stroke="url(#hum)"
                      strokeWidth={3}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Energía"
                      stroke="url(#ene)"
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Dispositivos */}
        {selectedMenu === "Dispositivos" && (
          <div>
            <h2 className="text-4xl font-bold mb-6">📱 Dispositivos</h2>
            <div className="mb-4 flex gap-4">
              {["Todos", "Encendidos", "Apagados"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg transition ${
                    filter === f
                      ? "bg-cyan-600 text-white"
                      : "bg-black/40 hover:bg-purple-500/40"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {devices
                .filter(
                  (d) =>
                    filter === "Todos" ||
                    (filter === "Encendidos" && d.on) ||
                    (filter === "Apagados" && !d.on)
                )
                .map((device, i) => (
                  <div
                    key={i}
                    className="bg-black/40 backdrop-blur-lg p-6 rounded-xl flex justify-between items-center shadow-lg border border-purple-500/30"
                  >
                    <span className="text-lg">{device.name}</span>
                    <button
                      onClick={() => {
                        const updated = [...devices];
                        updated[i].on = !updated[i].on;
                        setDevices(updated);
                      }}
                      className={`px-4 py-2 rounded-lg font-bold transition ${
                        device.on
                          ? "bg-cyan-500 hover:bg-cyan-600"
                          : "bg-red-500 hover:bg-red-600"
                      }`}
                    >
                      {device.on ? "Encendido" : "Apagado"}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Seguridad */}
        {selectedMenu === "Seguridad" && (
          <div>
            <h2 className="text-4xl font-bold mb-6">🔐 Seguridad</h2>
            <div className="space-y-6">
              <div className="bg-black/40 p-6 rounded-xl shadow-lg border border-cyan-500/30 flex justify-between items-center">
                <span>Sistema de seguridad</span>
                <button
                  onClick={() => setSecurityOn(!securityOn)}
                  className={`px-4 py-2 rounded-lg font-bold ${
                    securityOn ? "bg-green-500" : "bg-red-500"
                  }`}
                >
                  {securityOn ? "Activado" : "Desactivado"}
                </button>
              </div>
              <div className="bg-black/40 p-6 rounded-xl shadow-lg border border-purple-500/30 flex justify-between items-center">
                <span>Cámaras de vigilancia</span>
                <button
                  onClick={() => setCameraOn(!cameraOn)}
                  className={`px-4 py-2 rounded-lg font-bold ${
                    cameraOn ? "bg-green-500" : "bg-red-500"
                  }`}
                >
                  {cameraOn ? "Online" : "Offline"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Monitoreo */}
        {selectedMenu === "Monitoreo" && (
          <div>
            <h2 className="text-4xl font-bold mb-6">📊 Monitoreo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-black/40 p-6 rounded-xl shadow-lg border border-cyan-500/30">
                <h3 className="text-xl font-bold mb-4">Temperatura 🌡️</h3>
                <input
                  type="range"
                  min="10"
                  max="35"
                  value={temperature}
                  onChange={(e) => setTemperature(parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="mt-2 text-lg">{temperature}°C</p>
              </div>
              <div className="bg-black/40 p-6 rounded-xl shadow-lg border border-purple-500/30">
                <h3 className="text-xl font-bold mb-4">Humedad 💧</h3>
                <input
                  type="range"
                  min="20"
                  max="80"
                  value={humidity}
                  onChange={(e) => setHumidity(parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="mt-2 text-lg">{humidity}%</p>
              </div>
            </div>
          </div>
        )}

        {/* Energía */}
        {selectedMenu === "Energía" && (
          <div>
            <h2 className="text-4xl font-bold mb-6">⚡ Energía</h2>
            <div className="bg-black/40 p-6 rounded-xl shadow-lg border border-cyan-500/30">
              <h3 className="text-xl font-bold mb-4">
                Consumo actual: {energyUsage} kWh
              </h3>
              <input
                type="range"
                min="100"
                max="500"
                value={energyUsage}
                onChange={(e) => setEnergyUsage(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Chat */}
        {selectedMenu === "Chat" && (
          <div>
            <h2 className="text-4xl font-bold mb-6">💬 Chat con la Casa</h2>
            <div className="bg-black/40 p-6 rounded-xl shadow-lg border border-purple-500/30 h-96 overflow-y-auto space-y-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg max-w-xs ${
                    msg.sender === "Dueño"
                      ? "bg-cyan-600 ml-auto"
                      : "bg-gray-700 mr-auto"
                  }`}
                >
                  <strong>{msg.sender}: </strong>
                  {msg.text}
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg text-black"
                placeholder="Escribe un mensaje..."
              />
              <button
                onClick={sendMessage}
                className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-lg font-bold"
              >
                Enviar
              </button>
            </div>
          </div>
        )}

        {/* Configuración */}
        {selectedMenu === "Configuración" && (
          <div>
            <h2 className="text-4xl font-bold mb-6">⚙️ Configuración</h2>
            <div className="space-y-6 max-w-xl">
              <div className="bg-black/40 p-6 rounded-xl shadow-lg border border-cyan-500/30">
                <label className="block font-bold mb-2">Nombre del dueño:</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg text-black"
                />
              </div>
              <div className="bg-black/40 p-6 rounded-xl shadow-lg border border-purple-500/30">
                <label className="block font-bold mb-2">Idioma:</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg text-black"
                >
                  <option value="es">Español</option>
                  <option value="en">Inglés</option>
                </select>
              </div>
              <div className="bg-black/40 p-6 rounded-xl shadow-lg border border-pink-500/30 flex justify-between items-center">
                <span>Notificaciones</span>
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`px-4 py-2 rounded-lg font-bold ${
                    notifications ? "bg-green-500" : "bg-red-500"
                  }`}
                >
                  {notifications ? "Activadas" : "Desactivadas"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
