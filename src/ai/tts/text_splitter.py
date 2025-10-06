import re

def _split_text_into_sentences(text: str) -> list[str]:
    """
    Divide un texto en una lista de frases utilizando signos de puntuación como delimitadores.
    """
    # Divide por puntos, signos de interrogación, signos de exclamación, comas o punto y coma, manteniendo el delimitador.
    sentences = re.split(r'([.!?;,])', text)
    
    # Reconstruye las frases con sus delimitadores y filtra cadenas vacías
    result = []
    current_sentence = ""
    for part in sentences:
        if part in ['.', '!', '?', ';']:
            if current_sentence.strip():
                result.append(current_sentence.strip() + part)
            current_sentence = ""
        else:
            # Dividir por comas dentro de las partes que no son delimitadores finales de frase
            sub_parts = re.split(r'(,)', part)
            for sub_part in sub_parts:
                if sub_part == ',':
                    if current_sentence.strip():
                        result.append(current_sentence.strip() + sub_part)
                    current_sentence = ""
                else:
                    current_sentence += sub_part
    
    if current_sentence.strip():
        result.append(current_sentence.strip())

    return [s.strip() for s in result if s.strip()]