import torch

print(f"CUDA disponible: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"Nombre de la GPU: {torch.cuda.get_device_name(0)}")
    print(f"Número de dispositivos CUDA: {torch.cuda.device_count()}")