# Use PHP 8.2 with FPM
FROM php:8.2-fpm

# Set the working directory
WORKDIR /var/www

# Install system dependencies, PHP extensions, and Composer
RUN apt-get update && apt-get install -y \
    curl \
    git \
    unzip \
    libpq-dev \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libonig-dev \
    libzip-dev \
    libatk-bridge2.0-0 \
    libcups2 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libnss3 \                         
    libnspr4 \                                    
    libgbm1 \                                     
    libxkbcommon0 \                               
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    xvfb \
    && docker-php-ext-install pdo pdo_mysql mysqli zip mbstring exif pcntl bcmath gd \
    && curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Install Node.js (latest LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Set working directory
WORKDIR /var/www

# Copy application files
COPY . .

# Install Composer dependencies
RUN composer install --no-dev --optimize-autoloader

# Install npm dependencies and handle peer deps
RUN npm install --legacy-peer-deps

# Explicitly install playwright browsers and puppeteer
RUN npx playwright install chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD false
RUN npm install puppeteer --legacy-peer-deps

# Build assets for Vite
RUN npm run build

# Set permissions
RUN chown -R www-data:www-data /var/www \
    && chmod -R 775 storage bootstrap/cache

# Expose port 8080
EXPOSE 8080

# Start Laravel server
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8080"]
