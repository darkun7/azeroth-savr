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

# Build for GitHub Pages (output to dist/)
build: fetch-data fetch-icons
	$(NPM) run build

dev: fetch-data fetch-icons
	$(NPM) run dev

preview:
	$(NPM) run preview

clean:
	rm -rf dist src/data public/images
