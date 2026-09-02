SHELL := /bin/sh
NPM := npm
NODE := node

.PHONY: all install fetch-data fetch-icons build dev preview clean

all: build

install:
	$(NPM) install

# Download + convert the gearlib CSVs into src/data/*.json
fetch-data:
	$(NODE) scripts/fetch-data.js

# Download fortune + skill icons into public/images/*
fetch-icons:
	$(NODE) scripts/fetch-icons.js

# Build single-file dist/index.html (assumes data + icons already fetched)
build:
	npx vite build
	node scripts/inline-build.js

dev: fetch-data fetch-icons
	$(NPM) run dev

preview:
	$(NPM) run preview

clean:
	rm -rf dist src/data public/images
