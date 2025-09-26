# Usar Node.js 18 Alpine como imagen base
FROM node:18-alpine

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias
RUN npm ci

# Copiar el resto del código fuente
COPY . .

# Construir la aplicación
RUN npm run build

# Instalar un servidor HTTP simple para servir los archivos estáticos
RUN npm install -g serve

# Exponer el puerto 3000
EXPOSE 3000

# Comando para iniciar el servidor
CMD ["serve", "-s", "dist", "-l", "3000"]