<?php

/*pipe weight.php
 * 
 * Gets the OD & ID of pipe, then determines the pipe weight for use in 
 * Cameron EB702 D.
 * 
 * INPUT is appended to the address as a $_GET variable
 * ?od=6.625&wall=.330&minYS=135
 * 
 * First determine if the pipe is listed in API 5DP.
 * if so get the nomial weight from the pipe
 * 
 * If the pipe is not in API 5DP, calculate the pipe weight given the OD & ID.
 * 
 * 
 * 
 */

 include "functions.php";
 
 $OD = (!IsNullOrEmptyString($_GET["od"])?$_GET["od"]:"");
 $Wall = (!IsNullOrEmptyString($_GET["wall"])?$_GET["wall"]:"");
 $YS = (!IsNullOrEmptyString($_GET["minYS"])?$_GET["minYS"]:"");
 $ppf = "";
 
if(!IsNullOrEmptyString($OD) && !IsNullOrEmptyString($Wall) && !IsNullOrEmptyString($YS))
{
	 //Setup Connection with MySQL database
	$conn = connect_db();
	$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
	
	//Check pipe table for result in API 5DP
	//UPDATE NEEDED query will not select WHERE wall=x.xx
	try {
	    $stmt_pipe = $conn->prepare("SELECT * FROM Pipe WHERE OD=".$OD." && minYS=".$YS." && wall=".$Wall.";");   //Gets all . 
	    $stmt_pipe->execute();
		$count = $stmt_pipe->rowCount();
		//if rows exists, assign $ppf
		if($count>0){
			while( $row = $stmt_pipe->fetch(PDO::FETCH_ASSOC)){
				$ppf_statement="Found in API 5DP";    
				$ppf=$row['nom_weight'];
			}
		}
		else{//Else calculate the ppf
		    $ppf_statement="Not found. Calculated.";
			$ppf=round((pow($OD,2) - pow($OD-2*$Wall, 2))*2.92,2);
		}
	}
	catch(PDOException $pw) {
	    echo "Error: " . $pw->getMessage();
		die();
	}
	
	$conn = null;
}
else{// Nothing to return
 echo "";
 //$ppf="not enough info";
}

//echo $ppf_statement."<br />Pipe weight is ".$ppf;
echo $ppf;
?>
