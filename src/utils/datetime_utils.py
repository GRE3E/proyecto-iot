import datetime
import pytz
import locale

locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')

def get_current_datetime(timezone_str: str = 'UTC') -> datetime.datetime:
    """Obtiene la fecha y hora actual en la zona horaria especificada.

    Args:
        timezone_str (str): La cadena de la zona horaria (ej. 'America/Lima', 'Europe/Madrid').
                            Por defecto es 'UTC'.

    Returns:
        datetime.datetime: Objeto datetime con la fecha y hora actual en la zona horaria.
    """
    try:
        tz = pytz.timezone(timezone_str)
        return datetime.datetime.now(tz)
    except pytz.exceptions.UnknownTimeZoneError:
        print(f"Advertencia: Zona horaria desconocida '{timezone_str}'. Usando UTC por defecto.")
        return datetime.datetime.now(pytz.utc)

def format_datetime(dt: datetime.datetime, format_str: str = '%Y-%m-%d %H:%M:%S %Z%z') -> str:
    """Formatea un objeto datetime a una cadena de texto.

    Args:
        dt (datetime.datetime): El objeto datetime a formatear.
        format_str (str): La cadena de formato (ej. '%Y-%m-%d %H:%M:%S').
                          Por defecto es '%Y-%m-%d %H:%M:%S %Z%z'.

    Returns:
        str: La fecha y hora formateada como cadena.
    """
    return dt.strftime(format_str)

def format_date_human_readable(dt: datetime.datetime) -> str:
    """Formatea un objeto datetime a una cadena de texto legible para la fecha.

    Args:
        dt (datetime.datetime): El objeto datetime a formatear.

    Returns:
        str: La fecha formateada como cadena (ej. "Hoy es 07 de octubre del 2025").
    """
    return dt.strftime("Hoy es %d de %B del %Y")

def format_time_only(dt: datetime.datetime) -> str:
    """Formatea un objeto datetime a una cadena de texto para la hora.

    Args:
        dt (datetime.datetime): El objeto datetime a formatear.

    Returns:
        str: La hora formateada como cadena (ej. "15:30").
    """
    return dt.strftime("%H:%M")

# A simple mapping of common timezones to their primary countries.
# This can be expanded as needed.
TIMEZONE_TO_COUNTRY_MAP = {
    'America/Lima': 'Perú',
    'America/New_York': 'Estados Unidos',
    'Europe/Madrid': 'España',
    'Europe/London': 'Reino Unido',
    'Asia/Tokyo': 'Japón',
    'America/Mexico_City': 'México',
    'America/Bogota': 'Colombia',
    'America/Santiago': 'Chile',
    'America/Buenos_Aires': 'Argentina',
    'America/Caracas': 'Venezuela',
    'America/La_Paz': 'Bolivia',
    'America/Montevideo': 'Uruguay',
    'America/Asuncion': 'Paraguay',
    'America/Costa_Rica': 'Costa Rica',
    'America/Havana': 'Cuba',
    'America/Panama': 'Panamá',
    'America/Santo_Domingo': 'República Dominicana',
    'America/Guatemala': 'Guatemala',
    'America/Tegucigalpa': 'Honduras',
    'America/El_Salvador': 'El Salvador',
    'America/Managua': 'Nicaragua',
    'America/Puerto_Rico': 'Puerto Rico',
    'America/Toronto': 'Canadá',
    'America/Sao_Paulo': 'Brasil',
    'Africa/Cairo': 'Egipto',
    'Africa/Johannesburg': 'Sudáfrica',
    'Asia/Dubai': 'Emiratos Árabes Unidos',
    'Asia/Kolkata': 'India',
    'Australia/Sydney': 'Australia',
    'Pacific/Auckland': 'Nueva Zelanda',
    'UTC': 'Múltiple/Global' # UTC is not tied to a single country
}

def get_country_from_timezone(timezone_str: str) -> str:
    """Intenta inferir el país a partir de una cadena de zona horaria.

    Args:
        timezone_str (str): La cadena de la zona horaria (ej. 'America/Lima').

    Returns:
        str: El nombre del país o 'Desconocido' si no se encuentra en el mapa.
    """
    return TIMEZONE_TO_COUNTRY_MAP.get(timezone_str, 'Desconocido')