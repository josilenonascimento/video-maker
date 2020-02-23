const algorithmia = require('algorithmia')
const sentenceBoundaryDetection = require('sbd')
const algorithmiaApiKey = require('../credentials/algorithmia.json').apiKey
const { apiKey: watsonApiKey, url: watsonUrl } = require('../credentials/watson-nlu.json')

const NaturalLanguageUnderstandingV1 = require('ibm-watson/natural-language-understanding/v1')
const { IamAuthenticator } = require('ibm-watson/auth')

const nlu = new NaturalLanguageUnderstandingV1({
  version: '2019-07-12',
  authenticator: new IamAuthenticator({
    apikey: watsonApiKey,
  }),
  url: watsonUrl,
})

async function robot(content) {
  await fetchContentFromWikipedia(content)
  sanitizeContent(content)
  breakContentIntoSentences(content)
  limitMaxiumSentences(content)
  await fetchKeywordsOfAllSentences(content)

  async function fetchContentFromWikipedia(content) {
    const algorithmiaAuthenticated = algorithmia(algorithmiaApiKey)
    const wikipediaAlgorithmia = algorithmiaAuthenticated.algo('web/WikipediaParser/0.1.2')
    const wikipediaResponse = await wikipediaAlgorithmia.pipe(content.searchTerm)
    const wikipediaContent = wikipediaResponse.get()
    content.sourceContentOriginal = wikipediaContent.content
  }
  
  function sanitizeContent(content) {
    const withoutBlankLinesAndMarkdown = removeBlankLinesAndMarkdown(content.sourceContentOriginal)
    const withoutDatesInParenteses = removeDatesInParenteses(withoutBlankLinesAndMarkdown)
    
    content.sourceContentSanitized = withoutDatesInParenteses

    function removeBlankLinesAndMarkdown(text) {
      const allLines = text.split('\n')

      const withoutBlankLinesAndMarkdown = allLines.filter(line => {
        if (line.trim().length === 0 || line.trim().startsWith('=')) {
          return false
        }

        return true
      })

      return withoutBlankLinesAndMarkdown.join(' ')
    }

    function removeDatesInParenteses(text) {
      return text.replace(/\((?:\([^()]*\)|[^()])*\)/gm, '').replace(/  /g, ' ')
    }
  }

  function breakContentIntoSentences(content) {
    content.sentences = []

    const sentences = sentenceBoundaryDetection.sentences(content.sourceContentSanitized)
    sentences.forEach(sentence => {
      content.sentences.push({
        text: sentence,
        keywords: [],
        images: []
      })
    })
  }

  function limitMaxiumSentences(content) {
    content.sentences = content.sentences.slice(0, content.maxiumSentences)
  }

  async function fetchKeywordsOfAllSentences(content) {
    for (const sentence of content.sentences) {
      sentence.keywords = await fetchWatsonAndReturnSentence(sentence.text)
    }
  }

  async function fetchWatsonAndReturnSentence(sentence) {
    try {
      const { result } = await nlu.analyze({
        text: sentence,
        features: {
          keywords: {}
        }
      })

      const keywords = result.keywords.map(keyword => keyword.text)
      
      return keywords

    } catch(err) {
      console.log('err: ', err)
    }
  }

}

module.exports = robot
