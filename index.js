const readline = require('readline-sync')
const robots = {
  text: require('./robots/text.js')
}

async function start() {
  const content = {}
  
  content.searchTerm = askAndReturnSearchTerm()
  content.prefix = askAndReturnPrefix()
    
  await robots.text(content)

  function askAndReturnSearchTerm() {
    return readline.question('Type a Wikipedia search term: ')
  }

  function askAndReturnPrefix() {
    const prefixes = ['Who is', 'What is', 'The history of']
    const selectPrefixIndex = readline.keyInSelect(prefixes, 'Choose one option')
    const selectedPrefixText = prefixes[selectPrefixIndex]
    
    return selectedPrefixText
  }
  
  console.log(content)
}

start()
