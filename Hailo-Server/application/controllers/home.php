<?php

if (!defined('BASEPATH')) exit('No direct script access allowed');

class Home extends CI_Controller {

	public function index() {
		
		$this->load->view('home');
	}

	public function add_hail() {
		$lat = $_POST['lat'];
		$lon = $_POST['lon'];
		$user_id = $_POST['user_id'];
		$added_minutes = $_POST['added_minutes'] * 60;
		$hail_time = date("Y-m-d H:i:s", time() + $added_minutes);
		$query = "INSERT INTO hail (latitude, longitude, hail_time, user_id) VALUES ($lat, $lon, '$hail_time', $user_id)";
		$this->db->query($query);
	}

	public function remove_hail() {
		$user_id = $_POST['user_id'];
		$cancel_hail_query = "DELETE FROM hail WHERE user_id=$user_id";
		$this->db->query($cancel_hail_query);
	}

	public function passenger_cancel_ride() {
		$user_id = $_POST['user_id'];
		$find_id_query = "SELECT id FROM hail WHERE user_id=$user_id";
		$response = $this->db->query($find_id_query);
		$hail_id = $response->row()->id;
		$cancel_hail_query = "DELETE FROM hail WHERE id=$hail_id";
		$this->db->query($cancel_hail_query);
		$cancel_ride_query = "UPDATE ride SET user_canceled=1 WHERE hail_id=$hail_id";
		$this->db->query($cancel_ride_query);
	}

	public function driver_cancel_ride() {
		$hail_id = $_POST['hail_id'];
		$cancel_ride_query = "UPDATE ride SET driver_canceled=1 WHERE hail_id=$hail_id";
		$this->db->query($cancel_ride_query);
	}

	public function check_ride_cancel() {
		$user_type = $_POST['user_type'];
		$hail_id = $_POST['hail_id'];
		if ($user_type === "regular"){
			$check_query = "SELECT * FROM ride WHERE hail_id=$hail_id AND driver_canceled=1";
			$result = $this->db->query($check_query);
			if ($result->num_rows() > 0) {
				echo "canceled";
			}
		}else{
			$check_query = "SELECT * FROM ride WHERE hail_id=$hail_id AND user_canceled=1";
			$result = $this->db->query($check_query);
			if ($result->num_rows() > 0) {
				echo "canceled";
			}
		}
	}

	// pulls all hails within a 10 km radius from the past 20 minutes
	public function get_hails() {
		$lat = $_POST['lat'];
		$lon = $_POST['lon'];

		$R = 6371;  // earth's radius, km
		$rad = 10;

		$maxLat = $lat + rad2deg($rad / $R);
		$minLat = $lat - rad2deg($rad / $R);
		$maxLon = $lon + rad2deg($rad / $R / cos(deg2rad($lat)));
		$minLon = $lon - rad2deg($rad / $R / cos(deg2rad($lat)));

		$time_minus_20 = date("Y-m-d H:i:s", time() - 1200);
		$query = "SELECT * FROM hail WHERE hail_time >'$time_minus_20'
					AND latitude<$maxLat AND latitude>$minLat AND longitude<$maxLon AND longitude>$minLon";

		$response = $this->db->query($query);
		$hails = array();
		foreach ($response->result() as $row) {
			$hails[] = array('latitude' => $row->latitude, 'longitude' => $row->longitude, 
				'passenger_id' => $row->user_id, 'hail_time' => $row->hail_time, 'hail_id' => $row->id);
		}
		print json_encode($hails);
	}

	public function add_cab() {
		$lat = $_POST['lat'];
		$lon = $_POST['lon'];
		$user_id = $_POST['user_id'];
		$remove_cab_query = "DELETE FROM cab WHERE user_id=$user_id";
		$this->db->query($remove_cab_query);
		$time = date("Y-m-d H:i:s", time());
		$add_cab_query = "INSERT INTO cab (latitude, longitude, last_active, user_id) VALUES ($lat, $lon, '$time', $user_id)";
		$this->db->query($add_cab_query);
	}

	public function remove_cab() {
		$user_id = $_POST['user_id'];
		$query = "DELETE FROM cab WHERE user_id=$user_id";
		$this->db->query($query);
	}

	// pulls all cabs within a 10 km radius from the past hour
	public function get_cabs() {
		$lat = $_POST['lat'];
		$lon = $_POST['lon'];

		$R = 6371;  // earth's radius, km
		$rad = 10;

		$maxLat = $lat + rad2deg($rad / $R);
		$minLat = $lat - rad2deg($rad / $R);
		$maxLon = $lon + rad2deg($rad / $R / cos(deg2rad($lat)));
		$minLon = $lon - rad2deg($rad / $R / cos(deg2rad($lat)));

		$hour_ago = date("Y-m-d H:i:s", time() - 3600);

		$query = "SELECT * From cab
				WHERE latitude>$minLat AND latitude<$maxLat
				AND longitude>$minLon AND longitude<$maxLon
				AND last_active > '$hour_ago'";

		$response = $this->db->query($query);
		$cabs = array();
		foreach ($response->result() as $row) {
			$cabs[] = array("latitude" => $row->latitude, "longitude" => $row->longitude, "user_id" => $row->user_id);
		}
		echo json_encode($cabs);
	}

	public function add_ride() {
		$passenger_user_id = $_POST['passenger_user_id'];
		$cab_user_id = $_POST['cab_user_id'];
		$hail_id = $_POST['hail_id'];
		$time = date("Y-m-d H:i:s", time());
		$add_ride_query = "INSERT INTO ride (hail_id, passenger_user_id, cab_user_id, cab_response_time)
						VALUES ($hail_id, $passenger_user_id, $cab_user_id, '$time')";
		$this->db->query($add_ride_query);
	}

	public function check_ride() {
		$passenger_user_id = $_POST['passenger_user_id'];
		$find_ride_query = "SELECT hail_id, id FROM ride WHERE passenger_user_id=$passenger_user_id AND user_notified=0";
		$ride = $this->db->query($find_ride_query);
		if ($ride->num_rows() > 0) {
			$ride_id = $ride->row()->id;
			$update_ride_query = "UPDATE ride SET user_notified=1 WHERE id=$ride_id";
			$this->db->query($update_ride_query);
			echo $ride->row()->hail_id;
		} else {
			echo "false";
		}
	}

	public function add_user() {
		$uuid = $_POST['uuid'];
		$user_type = $_POST['type'];
		$find_user_query = "SELECT * FROM user WHERE uuid='$uuid'";
		$user_exists = $this->db->query($find_user_query);
		if ($user_exists->num_rows() == 0) {
			$insert_user_query = "INSERT INTO user (uuid, type) VALUES ('$uuid', '$user_type')";
			$this->db->query($insert_user_query);
			$user_id_query = "SELECT * FROM user WHERE uuid='$uuid'";
			$id_response = $this->db->query($user_id_query);
			print json_encode($id_response->row()->id);
		} else {
			print json_encode($user_exists->row()->id);
		}
	}

	public function update_user() {
		$user_id = $_POST['user_id'];
		$type = $_POST['type'];
		$update_user_query = "UPDATE user SET type='$type' WHERE id=$user_id";
		$this->db->query($update_user_query);
	}

}

/* End of file welcome.php */
/* Location: ./application/controllers/welcome.php */