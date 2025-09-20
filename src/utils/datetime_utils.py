import datetime
import pytz

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