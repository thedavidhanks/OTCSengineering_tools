<?php 
/* header.php
 * this file contains the <head> tag and the main navigation menu.
 * 
 * ADD CONTENT:
 * Change page title based on page
 * Change where "class=active_page" is located.
 * include js based on page
 *
 * read post variable
 * Set $title_name
 * Set $active_page
 */

//change the title and highlighted menu item based on page selection 
$active_config= "style=\"border-bottom:3px solid #fff\"";
$loadscript = "";

switch ($_GET["page"]) {
	case "calcs":
		$title_name = "Basic_Calculator";
		$home_page_active = "";
		$basiccalcs_page_active = $active_config;
 		$shear_page_active = "";
 		$BOPindex_page_active ="";
 		$pipe_page_active = "";
 		$project_page_active = "";
		$forms_page_active = "";
		switch ($_GET["sub"]){
			case "ssc":
			$title_name = "Simple Shear Calculator";
			$loadscript .= "load_form_fields();";  //This will preload the BOP selection by default.	
			//UPDATE if a save is present then need to run load_save_shear()
			if(isset($_GET["save"]) && is_numeric($_GET["save"])){
				$loadscript .=" load_saved_shear();";
			}	
			break;
		}
		break;
	case "pipe":
		$title_name = "Pipe Index";
		$home_page_active = "";
 		$shear_page_active = "";
 		$BOPindex_page_active ="";
 		$pipe_page_active = $active_config;
 		$project_page_active = "";
		$forms_page_active = "";
		break;
	case "bop":
		$title_name = "BOP index";
		$home_page_active = "";
 		$shear_page_active = "";
 		$BOPindex_page_active = $active_config;
 		$pipe_page_active = "";
 		$project_page_active = "";
		$forms_page_active = "";
		break;
	case "project":
		$title_name = "Project Builder";
		$home_page_active = "";
 		$shear_page_active = "";
 		$BOPindex_page_active ="";
 		$pipe_page_active = "";
 		$project_page_active = $active_config;
		$forms_page_active = "";
		break;
	case "updates":
		$title_name = "Update Log";
		$home_page_active = $active_config;
 		$shear_page_active = "";
 		$BOPindex_page_active ="";
 		$pipe_page_active = "";
 		$project_page_active = "";
		$forms_page_active = "";
		break;
	case "forms":
		$title_name = "Form - ";
		$home_page_active = "";
		$basiccalcs_page_active = "";
 		$shear_page_active = "";
 		$BOPindex_page_active ="";
 		$pipe_page_active = "";
 		$project_page_active = "";
		$forms_page_active = $active_config;
		switch ($_GET["sub"]){
			case "cids":
			$title_name .= "Client Input Data Sheet";
			//$loadscript .= "load_form_fields();"; 
			break;
		}
		break;
	default:
		$title_name = "Home";
		$home_page_active = $active_config;
 		$shear_page_active = "";
 		$BOPindex_page_active ="";
 		$pipe_page_active = "";
 		$project_page_active = "";
		break;
	//this will be the homepage case

}
$onloadscript = "onload=\"".$loadscript."\"";
?>

<head>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>NWTS tool set - <?php echo $title_name; ?></title>
	<meta name="description" content="Calculates BOP shear pressure given BOP and pipe variables">
	<meta name="author" content="David Hanks">
	
	<!--HEADER SCRIPTS-->
	<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
	<script src="include/jfunctions.js"></script>
	<script src="include/shear.js"></script><!-- FUTURE UPDATE - only include when doing Shear calculator to improve load time -->
	<script src="include/accum.js"></script> 
	
	<!--END HEADER SCRIPTS-->
	<!--STYLE SHEETS-->
	<style>

	</style>
	<link rel="stylesheet" href="https://www.w3schools.com/lib/w3.css">
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.4.0/css/font-awesome.min.css">
	<link rel="stylesheet" type="text/css" href="CSS/style.css">
</head>

<body <?php echo $onloadscript;?>>
<div class="wrapper">
<div class="w3-topnav w3-small w3-black">
  <a href="/Compliance" <?php echo $home_page_active; ?>><i class="fa fa-home w3-small"></i></a>
  <div class="w3-dropdown-hover">
  <a href="?page=calcs"<?php echo $basiccalcs_page_active; ?>>Calculators</a>
  	<div class="w3-dropdown-content w3-card-4 w3-black">
	    <a href="?page=calcs&sub=ssc">Shear Calculator</a>
	    <a href="?page=calcs&sub=atest">Accumulator Test</a>
  	</div>
  </div>
  <div class="w3-dropdown-hover">
  <a href="?page=bop" <?php echo $BOPindex_page_active; ?>>BOP Index</a>
    <div class="w3-dropdown-content w3-card-4 w3-black">
	    <a href="?page=bop&sub=Browse">Browse all</a>
	    <a href="?page=bop&sub=Detail">Detailed view</a>
	    <a href="?page=bop&sub=Add">Add new</a>
  	</div>
  </div>
   <div class="w3-dropdown-hover">
  <a href="?page=forms" <?php echo $forms_page_active; ?>>Forms</a>
    <div class="w3-dropdown-content w3-card-4 w3-black">
	    <a href="?page=forms&sub=cids">Client Input Data Sheet</a>
  	</div>
  </div>
  <!--<a href="?page=pipe" <?php echo $pipe_page_active; ?>>Pipe Index</a>-->
  <!--<a href="?page=project" <?php echo $project_page_active; ?>>Project Builder</a>-->
</div>

<?php 
/*
 *Example of a one tier drop down in the top menu
 *     <li> 
      <!-- First Tier Drop Down -->
      <label for="drop-1" class="toggle">Service +</label>
      <a href="#">Service</a>
      <input type="checkbox" id="drop-1"/>
      <ul>
        <li><a href="#">Service 1</a></li>
        <li><a href="#">Service 2</a></li>
        <li><a href="#">Service 3</a></li>
      </ul>
    </li>
 
 *  
 * 2 tier drop down
 * <li>
      <!-- First Tier Drop Down -->
      <label for="drop-2" class="toggle">Portfolio +</label>
      <a href="#">Portfolio</a>
      <input type="checkbox" id="drop-2"/>
      <ul>
        <li><a href="#">Portfolio 1</a></li>
        <li><a href="#">Portfolio 2</a></li>
        <li> 
          
          <!-- Second Tier Drop Down -->
          <label for="drop-3" class="toggle">Works +</label>
          <a href="#">Works</a>
          <input type="checkbox" id="drop-3"/>
          <ul>
            <li><a href="#">HTML/CSS</a></li>
            <li><a href="#">jQuery</a></li>
            <li><a href="#">Python</a></li>
          </ul>
        </li>
      </ul>
    </li>
 * 
 */?>
