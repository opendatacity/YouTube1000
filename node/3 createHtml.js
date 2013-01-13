

var generateJSON = true;
var generateThumbs = true;
var generateHugeThumbs = true;
var generateGridHTML = 'simple'; // false, 'info', 'simple'
var generateChart = true;
	
var width = 20;   // Höhe der Thumbnails
var height = 15;  // Breite der Thumbnails
var f = 1.4;      // Ausschnitt, um die 16:9-Ränder zu verhindern. 1 = nicht ausschneiden
var columns = 25; // Wieviele Spalten hat das Ding

var widthHuge  = Math.round(Math.min(480, 360*width/height)/f);
var heightHuge = Math.round(Math.min(360, 480*height/width)/f); 
 
var reason2info = {
	"Wir haben deine Spracheinstellung festgelegt.":{code:0},
	"Führe ein Upgrade auf die aktuelle Flash Player-Version aus, um die Wiedergabequalität zu verbessern.  Jetzt aktualisieren  oder  weitere Informationen  erhalten":{code:0},
	
	"Inhaltswarnung":{code:1},
	
	"Dieses Video enthält Content von UMG. Dieser Partner hat das Video in deinem Land aus urheberrechtlichen Gründen gesperrt.":{code:2},
	"Dieses Video enthält Content von BPI (British Recorded Music Industry) Limited und Beggars. Einer oder mehrere dieser Partner haben das Video aus urheberrechtlichen Gründen gesperrt.":{code:2},
	"Dieses Video ist in deinem Land nicht verfügbar.":{code:2},
	"Der betreffende Nutzer hat das Video in deinem Land nicht zur Verfügung gestellt.":{code:2},
	
	"Dieses Video ist in Deutschland nicht verfügbar, weil es möglicherweise Musik enthält, für die die erforderlichen Musikrechte von der GEMA nicht eingeräumt wurden.":{code:3},
	
	"Leider ist dieses Video, das Musik von SME beinhaltet, in Deutschland nicht verfügbar, da die GEMA die Verlagsrechte hieran nicht eingeräumt hat.":{code:4},
	"Leider ist dieses Video, das Musik von UMG beinhaltet, in Deutschland nicht verfügbar, da die GEMA die Verlagsrechte hieran nicht eingeräumt hat.":{code:4},
	"Leider ist dieses Video, das Musik von EMI beinhaltet, in Deutschland nicht verfügbar, da die GEMA die Verlagsrechte hieran nicht eingeräumt hat.":{code:4}
}
 


var fs = require('fs');
var sys = require('sys')
var spawn = require('child_process').spawn;

var list = JSON.parse(fs.readFileSync('../data/top1000.json', 'utf8'));

list.sort(function (a,b) { return b.viewCount - a.viewCount});
list.length = 1000;

var rows = list.length/columns;


for (var i = 0; i < list.length; i++) {
	var countries = {};
	var entry = list[i];
	var r = entry.restrictionsAll;
	for (var j = 0; j < r.length; j++) {
		var c = r[j];
		if (countries[c] === undefined) countries[c] = true;
	}
	entry.restrictionsAll = countries;
	
	// Fixe UTF-8-Fehler
	entry.reason = entry.reason.replace(/verf[^a-z]{2}gbar/g, 'verfügbar');
	entry.reason = entry.reason.replace(/ f[^a-z]{2}r /g, ' für ');
	entry.reason = entry.reason.replace(/m[^a-z]{2}glicher/g, 'möglicher');
}

function obj2List(obj) {
	var l = [];
	for (var i in obj) if (obj[i]) l.push(i);
	l.sort();
	return l;
}

if (generateJSON) {
	
	console.log('generate JSON');
	
	var data = [];
	for (var i = 0; i < list.length; i++) {
		var entry = list[i];

		entry.description = undefined;
		entry.rank = i+1;
		
		var restricted = reason2info[entry.reason];
		if (restricted === undefined) {
			console.error('url "'+entry.url+'"');
			console.error('Unknown reason "'+entry.reason+'"');
		} else {
			restricted = restricted.code
			if (entry.restrictedInDE != (restricted > 1)) {
				console.error(entry);
			}
			entry.restrictedInDE = restricted;
			entry.restrictionsAll['DE'] = (restricted > 1);
		}
		data[i] = {
			id: entry.id,
			viewCount: entry.viewCount,
			reason: entry.reason,
			thumbnail: entry.thumbnail,
			image: entry.image,
			url: entry.url,
			published: entry.published,
			updated: entry.updated,
			title: entry.title,
			author: entry.author,
			restrictedInDE: entry.restrictedInDE,
			restrictionsAll: obj2List(entry.restrictionsAll),
			rating: entry.rating,
			category: entry.category,
			rank: entry.rank
		}
	}
	fs.writeFileSync('../html/data/data.js', 'var data = '+JSON.stringify(data), 'utf8');
	fs.writeFileSync('../charts/data.json', JSON.stringify(data, null, '\t'), 'utf8');
}

if (generateThumbs || generateHugeThumbs) {
	var child = spawn('bash', [], {cwd: '..', stdio: [null, process.stdout, process.stderr]});
	
	child.stdin.write('echo "generate thumbs"\n');
	
	for (var i = 0; i < list.length; i++) {
		var s = '';
		id = list[i].id;
		
		if (generateThumbs) {
			child.stdin.write('convert "images/originals/thumb_'+id+'.jpg" -resize '+Math.round(width*f)+'x'+Math.round(height*f)+'^ -gravity center -crop '+width+'x'+height+'+0+0 "images/thumbs/thumb'+i+'.png"\n');
		}
		
		if (generateHugeThumbs) {
			var filename = 'images/hugethumbs/thumb_'+id+'.jpg';
			if (!fs.existsSync('../'+filename)) {
				child.stdin.write('convert "images/originals/thumb_'+id+'.jpg" -gravity center -crop '+widthHuge+'x'+heightHuge+'+0+0 -quality 95 "'+filename+'"\n');
			}
		}
		
		if ((i+1) % 100 == 0) {
			child.stdin.write('echo "   '+(100*(i+1)/list.length).toFixed(0)+'%"\n');
		}
	}
	
	if (generateThumbs) {
		child.stdin.write('echo "   generate grid image"\n');
		child.stdin.write('montage -tile '+columns+'x'+rows+' -geometry '+width+'x'+height+'+0+0 \'images/thumbs/thumb%d.png[0-999]\' html/images/grid.png\n');
		child.stdin.write('convert html/images/grid.png -quality 90 -interlace JPEG html/images/grid.jpg\n');
	}
	
	child.stdin.end();
}






