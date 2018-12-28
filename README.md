# Batjaa's personal blog

This is where my personal blog and portfolio lives.

## Getting Started

The blog is powered by hugo. Enjoy!

### Prerequisites

What things you need to install the software and how to install them

```
brew install hugo


```

### Installing

Clone the repo and run the local hubo server.

```
git clone git@github.com:batjaa/blog.git
hugo server
```

### And coding style tests

Explain what these tests test and why

```
Give an example
```

## Development

Currently there're not tooling for frontend development.


To have css compiled install less and compile the .less script

```
npm install -g less

lessc themes/mongkok/static/css/index.less themes/mongkok/static/css/index.css
```

To have JS files updated make changes and either manually copy the changes to public directory or change some file so hugo updates the whole public directory.

## Deployment

```
./deploy.sh [commit message]
```
