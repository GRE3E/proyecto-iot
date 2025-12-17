# Guía Final: La Estrategia "Divide y Vencerás" (Plan C)

Si todo lo anterior falló, es porque Colab no aguanta hacer la conversión "al vuelo".
Vamos a hacerlo manualmente paso a paso. Es más largo, pero no falla.

## PARTE 1: Entrenamiento (Training)

**(Si ya entrenaste y tienes los 'murphy_adapters' en Drive de la vez pasada, SALTA AL PASO 2)**.
Si no, ejecuta esto y reinicia.

### 1. Setup e Instalación

```python
from google.colab import drive
drive.mount('/content/drive')
```

```python
%%capture
import os, re
if "COLAB_" not in "".join(os.environ.keys()):
    !pip install unsloth
else:
    import torch; v = re.match(r"[0-9]{1,}\.[0-9]{1,}", str(torch.__version__)).group(0)
    xformers = "xformers==" + ("0.0.33.post1" if v=="2.9" else "0.0.32.post2" if v=="2.8" else "0.0.29.post3")
    !pip install --no-deps bitsandbytes accelerate {xformers} peft trl triton cut_cross_entropy unsloth_zoo
    !pip install --no-deps unsloth
!pip install transformers==4.56.2
!pip install --no-deps trl==0.22.2
```

### 2. Cargar Modelo y Configurar LoRA

```python
from unsloth import FastLanguageModel
import torch

max_seq_length = 512 # Optimizado para Colab gratuito
dtype = None
load_in_4bit = True

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = "unsloth/Qwen2.5-3B-Instruct",
    max_seq_length = max_seq_length,
    dtype = dtype,
    load_in_4bit = load_in_4bit,
)

model = FastLanguageModel.get_peft_model(
    model,
    r = 16,
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj",
                      "gate_proj", "up_proj", "down_proj",],
    lora_alpha = 16,
    lora_dropout = 0,
    bias = "none",
    use_gradient_checkpointing = "unsloth",
    random_state = 3407,
    use_rslora = False,
    loftq_config = None,
)
```

### 3. Cargar Dataset (train.jsonl)

Subir el archivo `train.jsonl` generado localmente a la carpeta raíz de Colab antes de ejecutar.

```python
from unsloth.chat_templates import get_chat_template
from datasets import load_dataset

tokenizer = get_chat_template(
    tokenizer,
    chat_template = "chatml",
    mapping = {"role" : "role", "content" : "content", "user" : "user", "assistant" : "assistant"},
)

def formatting_prompts_func(examples):
    convos = examples["messages"]
    texts = [tokenizer.apply_chat_template(convo, tokenize = False, add_generation_prompt = False) for convo in convos]
    return { "text" : texts, }

dataset = load_dataset("json", data_files = "train.jsonl", split = "train")
dataset = dataset.map(formatting_prompts_func, batched = True,)
```

### 4. Entrenar y Guardar Adaptadores

```python
from trl import SFTConfig, SFTTrainer

trainer = SFTTrainer(
    model = model,
    tokenizer = tokenizer,
    train_dataset = dataset,
    dataset_text_field = "text",
    max_seq_length = max_seq_length,
    dataset_num_proc = 2,
    packing = False,
    args = SFTConfig(
        per_device_train_batch_size = 1,
        gradient_accumulation_steps = 8,
        warmup_steps = 5,
        max_steps = 500, # 2 epochs (Entrenamiento sólido)
        learning_rate = 2e-4,
        logging_steps = 1,
        optim = "adamw_8bit",
        weight_decay = 0.01,
        lr_scheduler_type = "linear",
        seed = 3407,
        output_dir = "outputs",
    ),
)
trainer_stats = trainer.train()

# Guardar adaptadores en Drive
model.save_pretrained("/content/drive/MyDrive/murphy_adapters")
print("Adaptadores guardados en Drive. REINICIA EL ENTORNO AHORA.")
```

---

## PARTE 2: Fusión (Merging)

**Objetivo:** Crear un modelo completo (gigante) en tu Google Drive, fusionando lo que aprendió.
**Acción:** REINICIA EL ENTORNO (Borrar tiempo de ejecución) antes de empezar.

### 1. Setup

```python
from google.colab import drive
drive.mount('/content/drive')
```

```python
%%capture
import os, re
if "COLAB_" not in "".join(os.environ.keys()):
    !pip install unsloth
else:
    import torch; v = re.match(r"[0-9]{1,}\.[0-9]{1,}", str(torch.__version__)).group(0)
    xformers = "xformers==" + ("0.0.33.post1" if v=="2.9" else "0.0.32.post2" if v=="2.8" else "0.0.29.post3")
    !pip install --no-deps bitsandbytes accelerate {xformers} peft trl triton cut_cross_entropy unsloth_zoo
    !pip install --no-deps unsloth
!pip install transformers==4.56.2
```

### 2. Cargar y Fusionar en Disco

```python
from unsloth import FastLanguageModel
import torch

max_seq_length = 512
dtype = None
load_in_4bit = True

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = "/content/drive/MyDrive/murphy_adapters", # Carga adaptadores
    max_seq_length = max_seq_length,
    dtype = dtype,
    load_in_4bit = load_in_4bit,
)

FastLanguageModel.for_inference(model)

# Guardamos localmente primero
print("Fusionando y guardando localmente (rápido)...")
model.save_pretrained_merged("merged_model", tokenizer, save_method = "merged_16bit")

# Copiar a Drive manualmente (evita el error de archivo vacío)
print("Copiando a Google Drive (esto puede tardar)...")
!mkdir -p /content/drive/MyDrive/murphy_full_16bit
!cp -r merged_model/* /content/drive/MyDrive/murphy_full_16bit/

print("Fusionado guardado en Drive!")

# VERIFICACIÓN
import os
folder = "/content/drive/MyDrive/murphy_full_16bit"
print(f"\nVerificando archivos en {folder}:")
for f in os.listdir(folder):
    p = os.path.join(folder, f)
    if os.path.isfile(p):
        size = os.path.getsize(p) / (1024*1024)
        print(f"- {f}: {size:.2f} MB")

print("\nIMPORTANTE: Si ves archivos de 0.00 MB, algo falló. No pases al siguiente paso.")
```

---

## PARTE 3: Conversión GGUF (The Final Step)

**Acción:** REINICIA EL ENTORNO OTRA VEZ. Así liberamos toda la RAM para usar la herramienta de conversión pura (C++).

### 1. Setup Llama.cpp (Sin cargar Python pesado)

```python
from google.colab import drive
drive.mount('/content/drive')

!git clone https://github.com/ggerganov/llama.cpp
!mkdir -p llama.cpp/build
!cd llama.cpp/build && cmake .. && cmake --build . --config Release
!pip install -r llama.cpp/requirements.txt
```

### 2. Convertir a GGUF

Usamos el script oficial, leyendo desde Drive y escribiendo en Drive.

```python
# 1. Convertir a GGUF (f16 - Gigante) en LOCAL
# Leemos de Drive, pero escribimos temporalmente en Colab
print("Convirtiendo a f16 localmente...")
!python llama.cpp/convert_hf_to_gguf.py /content/drive/MyDrive/murphy_full_16bit --outfile /content/temp_f16.gguf

# Asegurar que existe la herramienta de compresión
# Llama.cpp cambió a CMake recientemente, así que usamos el método nuevo.
import os
quantize_path = "llama.cpp/build/bin/llama-quantize"

if not os.path.exists(quantize_path):
    print("Herramienta 'llama-quantize' no encontrada. Compilando con CMake (tarda unos min)...")
    !rm -rf llama.cpp/build
    !mkdir -p llama.cpp/build
    !cd llama.cpp/build && cmake .. && cmake --build . --config Release --target llama-quantize

# 2. Cuantizar a Q4_K_M (Comprimido) en LOCAL
print("Comprimiendo a Q4_K_M localmente...")
# Nota: La ruta del ejecutable cambia con cmake a build/bin/
!./llama.cpp/build/bin/llama-quantize /content/temp_f16.gguf /content/temp_q4km.gguf q4_k_m

# 3. SUBIR A DRIVE (Solo el archivo final)
print("Subiendo archivo final a Drive...")
!cp /content/temp_q4km.gguf /content/drive/MyDrive/murphy_q4km.gguf

# 4. VERIFICACIÓN FINAL
import os
path = "/content/drive/MyDrive/murphy_q4km.gguf"
if os.path.exists(path):
    size = os.path.getsize(path) / (1024*1024)
    print(f"EXITO TOTAL! Tu modelo está en: {path}")
    print(f"Tamaño: {size:.2f} MB")
else:
    print("ERROR: El archivo no aparece en Drive. Revisa los logs.")
```
