var storage = window.localStorage;
var user = JSON.parse(storage.getItem("user"));
var device_initialization = null;
var ride_check_interval = null;
var update_cab_interval;
var check_for_ride_cancel;
var userWatch = null;
var jQT = null;
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

$(document).ready(after_load);

function after_load() {
	setInterval(function() {
		scroll(0,0)
	}, 300);
	jQT = new $.jQTouch({
		slideSelector: "slideleft"
	});
	if (!user) {
		device_initialization = setInterval(function(){
			if (device !== undefined) {
				first_time_setup();
			}
		}, 500);
	}else{
		jQT.goTo($('#menu'));
		menu();
	}
	$('#view_map_button').bind(clickEvent, function(){
		if (user.info.type === "driver"){
			jQT.goTo($('#cab_interface'), 'slideleft');
			start_driver_hailo();
		}else if (user.info.type === "regular"){
			jQT.goTo($('#hailo_interface'), 'slideleft');
			start_regular_hailo();
		}
	});
	$('.interface_menu_button').bind(clickEvent, function() {
		jQT.goTo($('#menu'), 'slideright');
	});
	$('#switch_to_d_button, #switch_to_p_button').bind(clickEvent, function() {
		if (user.info.type === "driver") {
			remove_cab();
			update_user('regular');
		}else if (user.info.type === "regular"){
			update_user('driver');
			remove_hail();
		}
		jQT.goTo($('#menu'), 'slidedown');
		menu();
	});
	$('#refresh_cab_map').bind(clickEvent, function() {
		start_driver_hailo();
	});
	$('#find_ride_button').bind(clickEvent, function(){
		$('#after_hail_message').text('');
		$('#after_hail_message').hide();
		show_spinner('#map_canvas_2');
		add_hail(function(){
			get_cabs(function(cab_info){
				cab_info = JSON.parse(cab_info);
				console.log(cab_info.length + " cabs found");
				var word = cab_info.length === 1 ? "is" : "are";
				var pl = cab_info.length === 1 ? "" : "s";
				$('#after_hail_message').html('There ' + word + ' currently ' + '<span style=\'color:lightgreen; font-weight: bold;\'>' 
					+ cab_info.length + '</span>' + ' cab' + pl + ' near you.  You will be notified when a driver confirms your ride.');
				var user_location = new google.maps.LatLng(user.location.latitude, user.location.longitude);
				var map_settings = {
					center: user_location,
					zoom: 13,
					disableDefaultUI: true,
					disableDoubleClickZoom: true,
					keyboardShortcuts: false,
					mapTypeId: google.maps.MapTypeId.ROADMAP,
					styles: styles
				};
				var map = new google.maps.Map(document.getElementById("map_canvas_2"), map_settings);
				for (var index in cab_info) {
					var cab_user_id = cab_info[index]['user_id']; // unused so far
					var latitude = cab_info[index]['latitude'];
					var longitude = cab_info[index]['longitude'];
					var hail_location_object = new google.maps.LatLng(latitude, longitude);
					create_marker(map, hail_location_object, 'time_bypass', null, null);
				}
				$('#after_hail_message').show();
				hide_spinner();
			});
			ride_check_interval = setInterval(check_ride, 10000);
		})
	});
	$('#time_option_1, #time_option_2, #time_option_3').bind(clickEvent, function(){
		$('.time_selected').removeClass('time_selected');
		$(this).addClass('time_selected');
	});
	$('#pick_up_button').bind(clickEvent, function(){
		show_spinner();
		$('#hide_marker_popup').hide();
		$('#cancel_pickup_button').show();
		check_for_ride_cancel = setInterval(check_ride_cancel, 5000);
		$('#pick_up_button').html('Passenger Notified<br/>Proceed To Pick Them Up');
		add_ride(function(){
			hide_spinner();
		});
	});
	$('#cancel_pickup_button').bind(clickEvent, cancel_ride);
	$('#cancel_ride_button').bind(clickEvent, cancel_ride);
	document.addEventListener("pause", on_pause, false);
	document.addEventListener("resume", on_resume, false);
}

function on_pause() {
	console.log("application paused");
	if (user.info.type === "driver") {
		jQT.goTo($('#menu'));
	}else if (user.info.type === "regular" && $('div.current').attr('id') != 'after_hail'){
		jQT.goTo($('#menu'));
	}
}

function on_resume() {
	console.log("application resumed");
	if (user.info.type === "driver"){
		add_cab();
	}
}

function first_time_setup() {
	$('#first_time_user').show();
	clearInterval(device_initialization);
	user = {
		location: {
			latitude: null,
			longitude: null
		},
		info: {
			uuid: device.uuid,
			id: null,
			type: null
		}
	};
	$('#initiate_regular_user_button').bind(clickEvent, function() {
		user.info.type = "regular";
		add_user('regular', function(generated_id){
			user.info.id = generated_id;
			storage.setItem("user", JSON.stringify(user));
			menu();
		});
	});
	$('#initiate_cab_user_button').bind(clickEvent, function() {
		user.info.type = "driver";
		add_user('driver', function(generated_id) {
			user.info.id = generated_id;
			storage.setItem("user", JSON.stringify(user));
			menu();
		});
	});
}

function menu() {
	if (user.info.type === "driver") {
		setTimeout(add_cab, 1000);
		update_cab_interval = setInterval(add_cab, 300000); // update cab location every 5 minutes
		$('#switch_to_d_button').hide();
		$('#switch_to_p_button').show();
		$('#settings_header').text('Driver Settings');
		$('#view_map_button').text('Find Passengers');
		$('#driver_intro_message').show();
		$('#regular_intro_message').hide();
	}else if (user.info.type ==="regular"){
		remove_hail();
		$('#switch_to_d_button').show();
		$('#switch_to_p_button').hide();
		$('#settings_header').text('Passenger Settings');
		$('#view_map_button').text('Start');
		$('#driver_intro_message').hide();
		$('#regular_intro_message').show();
	}
}

function start_regular_hailo() {
	show_spinner('#hailo_interface');
	if (!google) {
		navigator.notification.alert('Map data could not load correctly. Please check your connection or try again later.', null, 'Hailo Message');
	}else{
		navigator.geolocation.getCurrentPosition(load_hailo_interface, geolocation_error, {
			enableHighAccuracy: true
		});
	}
}

function start_driver_hailo() {
	show_spinner('#cab_interface');
	if (!google) {
		navigator.notification.alert('Map data could not load correctly. Please check your connection or try again later.', null, "Hailo Message");
	}else{
		navigator.geolocation.getCurrentPosition(load_cab_interface, geolocation_error, {
			enableHighAccuracy: true
		});
	}
}

function load_hailo_interface(e) {
	user.location.latitude = e.coords.latitude;
	user.location.longitude = e.coords.longitude;
	var user_location_object = new google.maps.LatLng(user.location.latitude, user.location.longitude);
	var map_settings = {
		center: user_location_object,
		zoom: 17,
		disableDefaultUI: true,
		disableDoubleClickZoom: true,
		keyboardShortcuts: false,
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		styles: styles
	};
	var map = new google.maps.Map(document.getElementById("map_canvas"), map_settings);
	var marker_options = {
		position: user_location_object,
		map: map,
		draggable: true
	};
	var marker = new google.maps.Marker(marker_options);
	google.maps.event.addListener(marker, "dragend", function() {
		var point = marker.getPosition();
		map.panTo(point);
		user.location.latitude = point.Ya;
		user.location.longitude = point.Za;
	});
	hide_spinner();
}

function load_cab_interface(e) {
	user.location.latitude = e.coords.latitude;
	user.location.longitude = e.coords.longitude;
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
	var map = new google.maps.Map(document.getElementById("hail_map_canvas"), map_settings);
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
				navigator.notification.alert('Nobody is currently looking for a ride near your location', function(){}, 'Hailo Message');
			}
		}
		hide_spinner();
	});
}

function get_hails(callback) {
	$.post("http://hail.pagodabox.com/home/get_hails", {
		lat: user.location.latitude,
		lon: user.location.longitude
	}, callback)
}

function get_cabs(callback) {
	$.post('http://hail.pagodabox.com/home/get_cabs', {
		lat: user.location.latitude,
		lon: user.location.longitude
	}, callback);
}

function add_hail(callback) {
	var added_minutes = $('.time_selected').data('increment');
	$.post("http://hail.pagodabox.com/home/add_hail", {
		lat: user.location.latitude,
		lon: user.location.longitude,
		user_id: user.info.id,
		added_minutes: added_minutes
	}, callback)
}

function remove_hail() {
	clearInterval(ride_check_interval);
	$.post('http://hail.pagodabox.com/home/remove_hail', {
		user_id: user.info.id
	}, function() {
		console.log('hail removed');
	});
}

function add_cab() {
	console.log("cab added");
	navigator.geolocation.getCurrentPosition(function(e){
		user.location.latitude = e.coords.latitude;
		user.location.longitude = e.coords.longitude;
		$.post("http://hail.pagodabox.com/home/add_cab", {
			lat: user.location.latitude,
			lon: user.location.longitude,
			user_id: user.info.id
		})
	}, geolocation_error, {
		enableHighAccuracy: true
	});
}

function add_ride(callback) {
	var passenger_user_id = $('body').data('passenger_id');
	var hail_id = $('body').data('hail_id');
	$.post('http://hail.pagodabox.com/home/add_ride', {
		passenger_user_id: passenger_user_id,
		cab_user_id: user.info.id,
		hail_id: hail_id
	}, callback);
}

function cancel_ride() {
	clearInterval(check_for_ride_cancel);
	if (user.info.type === "driver") {
		$.post('http://hail.pagodabox.com/home/driver_cancel_ride', {
			hail_id: $('body').data('hail_id')
		}, function() {
			console.log("driver canceled ride");
		});
	}else if (user.info.type === "regular") {
		clearInterval(ride_check_interval);
		$.post('http://hail.pagodabox.com/home/passenger_cancel_ride', {
			user_id: user.info.id
		}, function() {
			console.log("passenger canceled ride");
		});
	}
}

function check_ride() {
	$.post('http://hail.pagodabox.com/home/check_ride', {
		passenger_user_id: user.info.id
	}, function(response){
		console.log("checked for confirmation");
		if (response != "false"){
			navigator.notification.vibrate(1000);
			setTimeout(function(){
				navigator.notification.vibrate(1000);
				navigator.notification.alert('A driver has responded.  Please wait to get picked up.', null, "Hailo Message");
			}, 500);
			$('body').data('hail_id', response);
			clearInterval(ride_check_interval);
			console.log("no longer checking for rides");
			check_for_ride_cancel = setInterval(check_ride_cancel, 5000);
		}
	});
}

function check_ride_cancel() {
	console.log("checked for ride cancel");
	$.post('http://hail.pagodabox.com/home/check_ride_cancel', {
		user_type: user.info.type,
		hail_id: $('body').data('hail_id')
	}, function(response) {
		if (response === "canceled"){
			clearInterval(check_for_ride_cancel);
			navigator.notification.vibrate(1000);
			setTimeout(function(){
				navigator.notification.vibrate(1000);
				if (user.info.type == "driver"){
					navigator.notification.alert('We Apologize, The Passenger Canceled Your Ride', null, "Hailo Message");
					setTimeout( function() {jQT.goTo($('#menu', 'slideleft')) }, 300);
				}else{
					navigator.notification.alert('We Apologize, The Driver Canceled Your Ride.', null, "Hailo Message");
					remove_hail();
				}
				setTimeout( function() {jQT.goTo($('#menu'), 'slidedown')}, 300);
			}, 500);
		}
	});
}

function remove_cab() {
	clearInterval(update_cab_interval);
	$.post('http://hail.pagodabox.com/home/remove_cab',{
		user_id: user.info.id
	})
}

function add_user(type, callback){
	$.post('http://hail.pagodabox.com/home/add_user', {
		uuid: user.info.uuid,
		type: type
	}, function(new_id) {
		callback(new_id);
	});
}

function update_user(type) {
	user.info.type = type;
	storage.setItem("user", JSON.stringify(user));
	$.post('http://hail.pagodabox.com/home/update_user',{
		user_id: user.info.id,
		type: type
	})
}

function geolocation_error() {
	navigator.notification.alert("We\'re sorry, your location could not be found!", null, "Hailo Message");
}

function create_marker(map, position, time, passenger_id, hail_id) {
	if (time ===  "time_bypass"){
		var pinColor = "ADDE63";
		var pinImage = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_icon&chld=taxi|"
			+ pinColor,
			new google.maps.Size(21, 34),
			new google.maps.Point(0,0),
			new google.maps.Point(10, 34));
	}else{
		var pinColor2 = "ADDE63";
		var pinImage2 = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_icon&chld=wc-male|"
			+ pinColor2,
			new google.maps.Size(21, 34),
			new google.maps.Point(0,0),
			new google.maps.Point(10, 34));
	}
	var marker_options = {
		map: map,
		position: position,
		title: time == 'time_bypass' ? null : time.toString(),
		icon: time == 'time_bypass' ? pinImage : pinImage2
	}
	var marker = new google.maps.Marker(marker_options);
	if (time !== "time_bypass") { // adding hail markers
		google.maps.event.addListener(marker, 'click', function() {
			$('#pick_up_button').text('Pick This Person Up');
			$('#cancel_pickup_button').hide();
			$('#pick_up_button').css('background-color', 'lightblue');
			setTimeout(function(){
				jQT.goTo($('#marker_info'), 'slideup');
			}, 50);
			var d = new Date();
			var minutes = d.getMinutes();
			var requested_minutes = marker.getTitle().substring(marker.getTitle().length-5, marker.getTitle().length-3);
			requested_minutes = requested_minutes - minutes;
			var pl = requested_minutes == 1 ? "" : "s";
			var message = " minute" + pl + " from now";
			if (Math.abs(parseInt(requested_minutes)) > 30) {
				requested_minutes = requested_minutes - 60;
			}
			if (requested_minutes < 0){
				requested_minutes = requested_minutes * -1;
				pl = requested_minutes == 1 ? "" : "s";
				message = " minute" + pl + " ago";
			}else if (requested_minutes == 0) {
				requested_minutes = "";
				message = " less than a minute ago";
			}
			$('#marker_title').text(requested_minutes + message);
			$('body').data('passenger_id', passenger_id);
			$('body').data('hail_id', hail_id);
		});
	}
}

function show_spinner() {
	var spinner_html = "<div class='spinner'><div class='bar1'></div><div class='bar2'></div><div class='bar3'></div><div class='bar4'></div><div class='bar5'></div><div class='bar6'></div><div class='bar7'></div><div class='bar8'></div><div class='bar9'></div><div class='bar10'></div><div class='bar11'></div><div class='bar12'></div></div>";
	arguments[0] === undefined ? $('.current').prepend(spinner_html) : $(arguments[0]).prepend(spinner_html);
}

function hide_spinner() {
	$('.spinner').remove();
}