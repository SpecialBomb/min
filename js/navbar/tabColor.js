var colorExtractorCanvas = document.createElement('canvas')
var colorExtractorContext = colorExtractorCanvas.getContext('2d')

function getColor (url, callback) {
  colorExtractorImage.onload = function (e) {
    var w = colorExtractorImage.width
    var h = colorExtractorImage.height
    colorExtractorCanvas.width = w
    colorExtractorCanvas.height = h

    var offset = Math.max(1, Math.round(0.00032 * w * h))

    colorExtractorContext.drawImage(colorExtractorImage, 0, 0, w, h)

    var data = colorExtractorContext.getImageData(0, 0, w, h).data

    var pixels = {}

    var d, add, sum

    for (var i = 0; i < data.length; i += 4 * offset) {
      d = Math.round(data[i] / 5) * 5 + ',' + Math.round(data[i + 1] / 5) * 5 + ',' + Math.round(data[i + 2] / 5) * 5

      add = 1
      sum = data[i] + data[i + 1] + data[i + 2]

      // very dark or light pixels shouldn't be counted as heavily
      if (sum < 310) {
        add = 0.35
      }

      if (sum < 50) {
        add = 0.01
      }

      if (data[i] > 210 || data[i + 1] > 210 || data[i + 2] > 210) {
        add = 0.5 - (0.0001 * sum)
      }

      if (pixels[d]) {
        pixels[d] = pixels[d] + add
      } else {
        pixels[d] = add
      }
    }

    // find the largest pixel set
    var largestPixelSet = null
    var ct = 0

    for (var k in pixels) {
      if (k === '255,255,255' || k === '0,0,0') {
        pixels[k] *= 0.05
      }
      if (pixels[k] > ct) {
        largestPixelSet = k
        ct = pixels[k]
      }
    }

    var res = largestPixelSet.split(',')

    for (var i = 0; i < res.length; i++) {
      res[i] = parseInt(res[i])
    }

    callback(res)
  }

  colorExtractorImage.src = url
}

var colorExtractorImage = document.createElement('img')

const defaultColors = {
  private: ['rgb(58, 44, 99)', 'white'],
  lightMode: ['rgb(255, 255, 255)', 'black'],
  darkMode: ['rgb(40, 44, 52)', 'white']
}

var hours = new Date().getHours() + (new Date().getMinutes() / 60)

// we cache the hours so we don't have to query every time we change the color

setInterval(function () {
  var d = new Date()
  hours = d.getHours() + (d.getMinutes() / 60)
}, 4 * 60 * 1000)

function updateTabColor (favicons, tabId) {
  // private tabs always use a special color, we don't need to get the icon
  if (tabs.get(tabId).private === true) {
    return
  }
  requestIdleCallback(function () {
    getColor(favicons[0], function (c) {
      // dim the colors late at night or early in the morning, or when dark mode is enabled
      var colorChange = 1
      if (hours > 20) {
        colorChange -= 0.015 * Math.pow(2.75, hours - 20)
      } else if (hours < 6.5) {
        colorChange -= -0.15 * Math.pow(1.36, hours) + 1.15
      }

      if (window.isDarkMode) {
        colorChange = Math.min(colorChange, 0.66)
      }

      c[0] = Math.round(c[0] * colorChange)
      c[1] = Math.round(c[1] * colorChange)
      c[2] = Math.round(c[2] * colorChange)

      var cr = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'

      var obj = {
        r: c[0] / 255,
        g: c[1] / 255,
        b: c[2] / 255
      }

      var textclr = getTextColor(obj)

      tabs.update(tabId, {
        backgroundColor: cr,
        foregroundColor: textclr
      })

      if (tabId === tabs.getSelected()) {
        updateColorPalette()
      }
      return
    })
  }, {
    timeout: 1000
  })
}

// generated using http://harthur.github.io/brain/
var getTextColor = function (bgColor) {
  var output = runNetwork(bgColor)
  if (output.black > 0.5) {
    return 'black'
  }
  return 'white'
}

var runNetwork = function anonymous (input) {
  var net = {
    'layers': [{
      'r': {},
      'g': {},
      'b': {}
    }, {
      '0': {
        'bias': 14.176907520571566,
        'weights': {
          'r': -3.2764240497480652,
          'g': -16.90247884718719,
          'b': -2.9976364179397814
        }
      },
      '1': {
        'bias': 9.086071102351246,
        'weights': {
          'r': -4.327474143397604,
          'g': -15.780660155750773,
          'b': 2.879230202567851
        }
      },
      '2': {
        'bias': 22.274487339773476,
        'weights': {
          'r': -3.5830205067960965,
          'g': -25.498384261673618,
          'b': -6.998329189107962
        }
      }
    }, {
      'black': {
        'bias': 17.873962570788997,
        'weights': {
          '0': -15.542217788633987,
          '1': -13.377152708685674,
          '2': -24.52215186113144
        }
      }
    }],
    'outputLookup': true,
    'inputLookup': true
  }

  for (var i = 1; i < net.layers.length; i++) {
    var layer = net.layers[i]
    var output = {}

    for (var id in layer) {
      var node = layer[id]
      var sum = node.bias

      for (var iid in node.weights) {
        sum += node.weights[iid] * input[iid]
      }
      output[id] = (1 / (1 + Math.exp(-sum)))
    }
    input = output
  }
  return output
}

function updateColorPalette () {
  var tab = tabs.get(tabs.getSelected())

  if (tab.private) {
    // private tabs have their own color scheme
    return setColor(defaultColors.private[0], defaultColors.private[1])
    // use the colors extracted from the page icon
  } else if (tab.backgroundColor || tab.foregroundColor) {
    return setColor(tab.backgroundColor, tab.foregroundColor)
    // otherwise use the default colors
  } else if (window.isDarkMode) {
    return setColor(defaultColors.darkMode[0], defaultColors.darkMode[1])
  } else {
    return setColor(defaultColors.lightMode[0], defaultColors.lightMode[1])
  }
}

// Below function from http://jsfiddle.net/Mottie/xcqpF/1/light/

function rgb2hex(rgb){
	
 rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
 
 return (rgb && rgb.length === 4) ? "#" +
  ("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
  ("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
  ("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : '';
}

// Below function from https://css-tricks.com/snippets/javascript/lighten-darken-color/

function lightenDarkenHexColor(col, amt) {
  
    var usePound = false;
  
    if (col[0] == "#") {
        col = col.slice(1);
        usePound = true;
    }
 
    var num = parseInt(col,16);
 
    var r = (num >> 16) + amt;
 
    if (r > 255) r = 255;
    else if  (r < 0) r = 0;
 
    var b = ((num >> 8) & 0x00FF) + amt;
 
    if (b > 255) b = 255;
    else if  (b < 0) b = 0;
 
    var g = (num & 0x0000FF) + amt;
 
    if (g > 255) g = 255;
    else if (g < 0) g = 0;
 
    return (usePound?"#":"") + String("000000" + (g | (b << 8) | (r << 16)).toString(16)).slice(-6);
  
}

function setColor (bg, fg) {
  var background = document.getElementsByClassName('theme-background-color')
  var textcolor = document.getElementsByClassName('theme-text-color')
  var tabs = document.getElementsByClassName('tab-item')
  
  console.log(bg)

  for (var i = 0; i < background.length; i++) {
    background[i].style.backgroundColor = bg
  }

  for (var i = 0; i < textcolor.length; i++) {
    textcolor[i].style.color = fg
  }

  if (fg === 'white') {
    document.body.classList.add('dark-theme')
    for (var i = 0; i < tabs.length; i++) {
		tabs[i].style.borderRightColor = lightenDarkenHexColor(rgb2hex(bg), 20)
	}
  } else {
    document.body.classList.remove('dark-theme')
    for (var i = 0; i < tabs.length; i++) {
		tabs[i].style.borderRightColor = lightenDarkenHexColor(rgb2hex(bg), -20)
	}
  }
}

// theme changes can affect the tab colors
window.addEventListener('themechange', function (e) {
  updateColorPalette()
})
