var user = {
	location: {}
}
var styles = [{
	stylers: [{
		hue: "#00ffe6"
	}, {
		saturation: -20
	}]
},{
	featureType: "road",
	elementType: "geometry",
	stylers: [{
		lightness: 100
	}, {
		visibility: "simplified"
	}]
},{
	featureType: "poi",
	elementType: "labels",
	stylers: [{
		visibility: "off"
	}]
}];

var map;

$(document).ready(function(){
	navigator.geolocation.getCurrentPosition(function(location){
		user.location.latitude = location.coords.latitude;
		user.location.longitude = location.coords.longitude;
		var user_location_object = new google.maps.LatLng(user.location.latitude, user.location.longitude);
		var map_settings = {
			center: user_location_object,
			zoom: 14,
			disableDefaultUI: true,
			disableDoubleClickZoom: true,
			keyboardShortcuts: false,
			mapTypeId: google.maps.MapTypeId.ROADMAP,
			styles: styles
		};
		map = new google.maps.Map(document.getElementById("map_canvas"), map_settings);
		get_hails(function(hails) {
			hails = JSON.parse(hails);
			console.log(hails.length + " hails received");
			if (hails.length > 0){
				for (var index in hails) {
					var latitude = hails[index]['latitude'];
					var longitude = hails[index]['longitude'];
					var passenger_id = hails[index]['passenger_id'];
					var time = hails[index]['hail_time'];
					var hail_id = hails[index]['hail_id'];
					var hail_location_object = new google.maps.LatLng(latitude, longitude);
					create_marker(map, hail_location_object, time, passenger_id, hail_id);
				}
			}else{
				if ($('div.current').attr('id') == 'cab_interface') {
					alert('Nobody is currently looking for a ride near your location');
				}
			}
		});
	});
});

function get_hails(callback) {
	$.post("http://hail.pagodabox.com/home/get_hails", {
		lat: user.location.latitude,
		lon: user.location.longitude
	}, callback)
}

function create_marker(map, position, time, passenger_id, hail_id) {
	console.log("marker created");
	var pinColor = "ADDE63";
	var pinImage = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_icon&chld=wc-male|"
		+ pinColor,
		new google.maps.Size(21, 34),
		new google.maps.Point(0,0),
		new google.maps.Point(10, 34));
	var marker_options = {
		map: map,
		position: position,
		icon: pinImage
	}
	var marker = new google.maps.Marker(marker_options);
}