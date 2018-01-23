/**shear.js
 *
 * This file contains no php statements and is left as a js file to reduce load time of the cached file for the user.  
 * Functions within are only utilized during shear calculations, so this file does not need to be loaded on other pages. 
 * 
 * author David Hanks 
 * Inital release Feb 5, 2016
 *
 * TODO: ensure updateShearPressure is called when:
 *  pipe is changed
 * closing area changes
 * closing pressure adjustment changes
 * MOPFLPS changes
 *
 **KNOWN ISSUES:
 *1) When pipe with strength is added after a Cameron BOP is selected, the Cameron is not shown as an available force.
 */
var database = firebase.database(),
    dbRefWorksheet = database.ref().child('shearWorksheet'),
    newWorksheet = dbRefWorksheet.push(),
    gradeObj = { 
        E75: { min: 75000, max: 105000 },
        L80: { min: 80000, max: 95000 },
        X95: { min: 95000, max: 125000 },
        G105: { min: 105000, max: 135000 },
        P110: { min: 110000, max: 140000 },
        Q125: { min: 125000, max: 150000 },
        S135: { min: 135000, max: 165000 },
        Z140: { min: 140000, max: 160000 },
        V150: { min: 150000, max: 165000 },
        H40: { min: 40000, max: 80000 },
        J55: { min: 55000, max: 80000 },
        K55: { min: 55000, max: 80000 },
        M65: { min: 65000, max: 85000 },
        N80: { min: 80000, max: 110000 },
        C90: { min: 90000, max: 105000 },
        R95: { min: 95000, max: 110000},
        T95: { min: 95000, max: 110000 },
        C110: { min: 110000, max: 120000 }
    };
    console.log('Created key: '+newWorksheet.key);
function display_results(){
    var pressures = jQuery.extend({},Calc_all());
    //Fill SUMMARY BOX
    
    //Well Pressure
    $('#P_mud').html(check_value_isNumber(pressures.Press_well));
    //Dominate Well Pressure
    $('#WellP_type').html(pressures.Press_type);
    //Seawater head pressure
    $('#P_head_sw').html(check_value_isNumber(pressures.Press_head_sw));
    //Control fluid head pressure
    $('#P_head_cf').html(check_value_isNumber(pressures.Press_head_cf));
    //Closing Pressure adjustment
    $('#P_adj').text(check_value_isNumber(pressures.Press_adj,2));
    //Shear Pressure info
    $("#get_link").prop('disabled',false).attr('title',"Click to get a sharable link");
    
    //write values to firebase database
    newWorksheet.child('Well').update({
        Pressure: pressures.Press_well,
        DominatePressureType: pressures.Press_type,
        SeaHeadPressure: pressures.Press_head_sw,
        controlHeadPressure: pressures.Press_head_cf,
        closingPressureAdjustment: check_value_isNumber(pressures.Press_adj,2)
    });
    updateShearPressures();
}
function getPreferredMethod(tubeReference){
    //returns the preferred method of those available for the given pipe snapshot.
    //tubeReference -> firebase database reference
    var cameronMethodAvailable = false,
        westMethodAvailable = false,
        deMethodAvailable = false,
        preferred = {}, 
        pipeNo;
    
    tubeReference.once("value", function(snapshot){
        //Look at the data in tubeReference and determine which forces exist.
       cameronMethodAvailable = snapshot.child('CamForce').val() > 0;
       westMethodAvailable = snapshot.child('WestForce').val() > 0;  
       deMethodAvailable = snapshot.child('DeForce').val() > 0;
       if(cameronMethodAvailable){
            preferred["method"] = "Cameron";
            preferred["forceValue"] = snapshot.child('CamForce').val();
        }else if(westMethodAvailable){
            preferred["method"] = "West";
            preferred["forceValue"] = snapshot.child('WestForce').val();
        }else if(deMethodAvailable){
            preferred["method"] = "DE";
            preferred["forceValue"] = snapshot.child('DeForce').val();
        }else{ 
            preferred["method"] = false;
            preferred["forceValue"] = false;
        }
        pipeNo = snapshot.child('pipeNo').val();
    });
    //console.log(preferred.method+" is the preferred method to evaluate pipe #"+pipeNo);
    return preferred;
}
function updateCamForces(tubeObj){
        //A new BOP was selected, check the tubeObj supplied and update the firebase database.
        //tubeObj is a snapshot of a particular tube in the database
	var pipeODval = tubeObj.child('diameter').val(),
            pipeNo = tubeObj.child('pipeNo').val(),
            tubeType = tubeObj.child('type').val(),
            weight = tubeObj.child('ppf').val(),
            strengthType = tubeObj.child('strengthType').val(),  //either "strength" or "grade"
            evalYS, bopID, F_CAM, F_CAM_info, pipeGrade = null, c3QueryString,
            preferredMethod = "",
            isTube = (tubeType === "pipe" || tubeType === "casing" || tubeType === "tubing"  )? true: false;
	//if the BOP is a cameron, include the Cameron Force		
	if($('#OEM_select option:selected').text() === 'Cameron'){ //TODO: Update to work for casing/tubing grade
            console.log('Update tubular #'+pipeNo+' with Cameron Forces');  //testing
            evalYS=tubeObj.child('evalStrength').val();
            
            if(isTube){
                bopID = $('#BOP_select').val();
                if(strengthType === "grade"){
                    //pipeGrade = tubeType === "pipe" ?   $('#tube_grade option:selected').text() : $('#casing_grade option:selected').text();
                    pipeGrade = tubeObj.child('grade').val();
                    c3QueryString = "bop_id="+bopID+"&pipe_grade="+pipeGrade+"&pipe_od="+pipeODval;
                }else{
                    c3QueryString = "bop_id="+bopID+"&pipe_yield="+(evalYS/1000)+"&pipe_od="+pipeODval;
                }
                console.log("requesting: include/C3.php?"+c3QueryString);
                $.get("include/C3.php?"+c3QueryString, function(c3){
                    F_CAM = (weight*c3*evalYS).toFixed(0);  //force in lbs
                    F_CAM_info = F_CAM+" = "+weight+" x "+c3+" x "+evalYS;
                    tubeObj.ref.update({
                        preferredMethod: "Cameron",
                        selectedMethod: "Cameron",
                        ppf: weight, 
                        CamForce: F_CAM, 
                        CamInfo: F_CAM_info,
                        C3: c3
                }).then(function(){console.log('Updated pipe '+tubeObj.child('pipeNo').val()+' to include cameron forces');}, function(error){console.log('Error on fb update: '+error);});
                }).fail(function(err){console.log("Failed to get C3 value: "+err);});
            }else{
                //this is a wireline
            }	
	}else{ //Not a Cameron BOP, remove any Cameron Forces that exist
            //TODO: Determine the preferred/selected evaluation method
            tubeObj.ref.update({
                CamForce: null, 
                CamInfo: null,
                C3: null
            }).then(function(){
                console.log('Updated pipe '+tubeObj.child('pipeNo').val()+' to remove cameron forces');
                preferredMethod = getPreferredMethod(tubeObj.ref).method;
                tubeObj.ref.update({ 
                    preferredMethod: preferredMethod,
                    selectedMethod: preferredMethod
                });
            }, function(error){console.log('Error nulling cameron data: '+error);
                
            });
            
            
	}
        //TODO: call a function that determines the preferred method.
}
function BOPdataToFireBase(){
    //Adds the Closing Area, Closing Ratio, Tailrod Area, & MOPFLPS to firebase
    var OEM = $('#OEM_select option:selected').text();
    var model = $('#BOP_select option:selected').text();
    var closingArea = $('#bop_closingarea').val();
    var closingRatio = $('#bop_closingratio').val();
    var trArea = $('#bop_trarea').val() ? $('#bop_trarea').val() : "";
    var MOPFLPS = $('#bop_MOPFLPS').val();
   
    newWorksheet.child('BOP').update({
       OEM: OEM,
       model: model,
       closingArea: closingArea,
       closingRatio: closingRatio,
       trArea: trArea,
       MOPFLPS: MOPFLPS
    });
}

function updateShearPressures(){
    /*Update shear pressures should be called whenever any of the following changes:
     * pipe is changed
     * closing area changes
     * closing pressure adjustment changes
     * MOPFLPS changes
     * evaluation method changes
     * 
     */
    console.log("updateShearPressures() triggered...");
    //COMPUTE THE CLOSING PRESSURE
    //Is there a BOP closing area?
    var closingAreaExists = false, Padj, MOPFLPS, Pseal, Pshear, Poperate, PoperateDef, PoperateEq, forceValue, closingArea = null;
    newWorksheet.once('value', function(snapshot){
        closingAreaExists = (snapshot.child('BOP/closingArea').val()!== null);
        //console.log("Closing Area Exists = "+closingAreaExists);
        if(closingAreaExists){
            //console.log("CA="+snapshot.child('closingArea').val());
            closingArea = check_value_isNumber(snapshot.child('BOP/closingArea').val(),2,0);
            Padj = check_value_isNumber(snapshot.child('Well/closingPressureAdjustment').val(),0,0);
            MOPFLPS = check_value_isNumber(snapshot.child('BOP/MOPFLPS').val(),0,0);
            Pseal = parseFloat(Padj) + parseFloat(MOPFLPS);
            newWorksheet.child('tubulars').once("value", function(tubes){
                if(tubes.hasChildren()){
                    tubes.forEach(function(tube){
                        //Get the selected force value
                        switch(tube.child('selectedMethod').val()){
                            case "DE":
                                forceValue = check_value_isNumber(tube.child('DeForce').val(),0,0);
                                break;
                            case "West":
                                forceValue = check_value_isNumber(tube.child('WestForce').val(),0,0);
                                break;
                            case "Cameron":
                                forceValue = check_value_isNumber(tube.child('CamForce').val(),0,0);
                                break;
                        }                   
                        console.log("forcevalue for pipe "+tube.child('pipeNo').val()+": "+forceValue+ " lbs");
                        
                        //Calculate the Shear Pressure
                        Pshear = (forceValue)/closingArea+parseFloat(Padj);
                        console.log(Pshear);
                        
                        //Use the greater of the shear pressure or the sealing pressure as the operating pressure.
                        if(Pshear > Pseal){
                            Poperate = Pshear;
                            PoperateDef = "Shear pressure = {Shear Force}/{Closing Area} + {Closing Pressure adjustment}";
                            PoperateEq = Poperate.toFixed(0)+" = "+forceValue+" / "+closingArea+" + "+Padj;
                        }else{
                            Poperate = Pseal;
                            PoperateDef = "Shear pressure = {MOPFLPS} + {Closing Pressure adjustment}";
                            PoperateEq = Poperate.toFixed(0)+" = "+MOPFLPS+" + "+Padj;
                        }
                        //record shear pressure and shear pressure equation
                        tube.ref.update({
                            OperatingPressure: Poperate,
                            OperatingPressureDefinition: PoperateDef,
                            OperatingPressureEquation: PoperateEq
                        });
                    });
                }else{
                    console.log('tube or closingarea DNE');
                    //console.log('tubes: '+tubesExist+'  | closing Area: '+closingAreaExists);
                }
            });
        }
    });
    
    
    
}
$(document).ready(function() {
    "use strict";
    var fb_tubulars = newWorksheet.child('tubulars');
    /*DELETE - commented out on 1/18/2018
    newWorksheet.set({
        Well: {
            Pressure: "",
            DominatePressureType: "",
            SeaHeadPressure: "",
            controlHeadPressure: "",
            closingPressureAdjustment: ""
        },
        
        BOP: { 
            OEM: "",
            model: "",
            closingArea: "",
            closingRatio: "",
            trArea: "",
            MOPFLPS: ""
        }
        
    });
        */

    //disable the button to get a sharable link until a shear pressure is calculated.
    $("#get_link").prop('disabled',true).attr('title',"Pipe, Well, and BOP data are required to get link.");
       
/*
 * Form Error Checking
 */
    //Wall thickness should be a number and it should not start with "."  
    // "0.25" is ok ".25" is not
    //TODO: wall should start with 0 not "."
    $('#pipe_wall').keyup(function(){
        if($('#pipe_wall').val().match("^.")){
            //var wall_float = parseFloat('0'+$('pipe_wall').val(),3);
            //$('#pipe_wall').val(wall_float);
        }
    });
		
/*
 * TUBULAR FORM 
 */
    //Show the correct pipe grade if pipe, tubing, or casing is selected.
    $("#tubeStrengthType").change(function(){
        if($("#tubeStrengthType").val()==="grade"){
            $('#tubeStrength').addClass("w3-hide");

            if($('#tube_type').val()==="pipe"){
               $('#tubeGrade').removeClass("w3-hide");
               $('#casingTubeGrade').addClass("w3-hide");
            }
            else if(($('#tube_type').val()=== "tubing") || ($('#tube_type').val()=== "casing")){
               $('#casingTubeGrade').removeClass("w3-hide");
               $('#tubeGrade').addClass("w3-hide");
            }
        }else{
        $('#tubeGrade').addClass("w3-hide");
        $('#casingTubeGrade').addClass("w3-hide");
        $('#tubeStrength').removeClass("w3-hide");
        }
    });
    //Test Pipe Box
    $('#testPipe').click(function (){
        if($('#testPipe').data('value')){
            $('#testPipe').removeClass('w3-blue').addClass('w3-opacity');
            $('#testPipe').data('value',false);
            $('#testPipe').html('Test Pipe');
        }else{
           $('#testPipe').addClass('w3-blue').removeClass('w3-opacity');
           $('#testPipe').data('value',true);
           $('#testPipe').html('Test Pipe <i class="fa fa-check" aria-hidden="true"></i> ');
        }
    });
    //Show the appropriate inputs for the type for tublular selected
    //For wireline, slickline, e-line, or braided cable show OD and breaking strength. 
    //For casing, tubing, and pipe show OD, wall, Elongation and either yield or Grade for strength.
    $('#tube_type').change(function(){
            var tubeType = $('#tube_type').val();
            if (tubeType === 'casing' || tubeType === 'pipe' || tubeType === 'tubing'){
                $("#tubeStrengthType>option[value='brStrength']").prop("disabled",true);
        $("#tubeStrengthType>option[value='strength']").prop("disabled",false);
        $("#tubeStrengthType>option[value='grade']").prop("disabled",false);

        //show od, wall, % elongation
        $('.tubeOnly').removeClass('w3-hide');
        $('.wireOnly').addClass('w3-hide');

        //maintain the strength type, but change the grades available if pipe was changed to (casing || tubing) OR vise versa
                if($('#tubeStrengthType').val()==="grade"){
            if ($('#tube_type').val() === "pipe"){
               $('#tubeGrade').removeClass('w3-hide');
               $('#casingTubeGrade').addClass('w3-hide');
               $('#tubeStrength').addClass('w3-hide');
            }
            else if ($('#tube_type').val() === "casing" || $('#tube_type').val() === "tubing"){
                $('#casingTubeGrade').removeClass('w3-hide');
                $('#tubeGrade').addClass('w3-hide');
                $('#tubeStrength').addClass('w3-hide');
            }
        }else if ($("#tubeStrengthType").val()==="strength"){
            //keep #tubeStrength visible
            //keep #tubeGrade & #casingTubeGrade hidden
        }else{ //by default select grade
            $("#tubeStrengthType>option[value='grade']").prop("selected",true);
            $('#tubeStrengthType').change();
        }
            }else{
                    $("#tubeStrengthType>option[value='brStrength']").prop("disabled",false);
                    $("#tubeStrengthType>option[value='strength']").prop("disabled",true);
                    $("#tubeStrengthType>option[value='grade']").prop("disabled",true);
                    $("#tubeStrengthType>option[value='brStrength']").prop("selected",true);

                    //show od, wall, % elongation
                    $('.tubeOnly').addClass('w3-hide');		
                    $('.wireOnly').removeClass('w3-hide');	
            }
    });
	
/*
 * PIPE TABLE DISPLAY & Force approximation display
 * Listen to the firebase database and update the html table
 */	
	 
    //When a tubular is added to the database, order them by breaking strength and renumber    
    fb_tubulars.orderByChild('brkStrength_sortDesc').on("value", function(data){
        var newPipeNo = 1, 
            newWireNo = 1;

        //update the pipe number based on breaking strength
        data.forEach(function(childData){
            var type = childData.child('type').val();

            if(type === 'pipe' || type === 'tubing' || type === 'casing'){
                childData.ref.update( {pipeNo: newPipeNo});
                newPipeNo +=1;
            }else{
                childData.ref.update( {pipeNo: newWireNo});
                newWireNo +=1;
            }
        });
        
        //if there's pipes unhide the table
        if(newPipeNo>1){ $('#tblPipe').removeClass('w3-hide');}
        else{$('#tblPipe').addClass('w3-hide');}
        //if there's wires unhide the table
        if(newWireNo>1){ $('#tblWire').removeClass('w3-hide');}
        else{$('#tblWire').addClass('w3-hide');}

        console.log("listener saw : ", newPipeNo-1, " pipes &", newWireNo-1, "wires");
        console.log(data.val());
        
        //Generate a new table
        //Get latest snapshot of data after pipeNo update. "data" uses snapshot before pipeNo is updated.  Need to get "newdata"
        fb_tubulars.orderByChild('pipeNo').once("value", function(newdata){
            var tbl_forceApprox = "",
                tbl_pressureApprox = "";
            
            updateShearPressures();
            
            //Clear the table except the header
            $('.pipeSummaryRow').remove();
            $('.wireSummaryRow').remove();
            newdata.forEach(function(childData){
                var type = childData.child('type').val(),
                    newPipeRow, newWireRow, newPipeForce, newPipeInfo, visibleOption,
                    newPipePressure, newPipePressureInfo,
                    preferredMethod = childData.child('preferredMethod').val(),
                    selectedMethod = childData.child('selectedMethod').val(),
                    pipeElong_txt, calcMethodOptionHTML = "",
                    cameronMethodAvailable = childData.child('CamForce') && childData.child('CamForce').val() > 0,
                    westMethodAvailable = childData.child('WestForce') && childData.child('WestForce').val() > 0,
                    calculationMethods = {
                        selectedForceValue: 0,
                        selectedForceInfo: "",
                        available: []
                    };
                if(type === 'pipe' || type === 'tubing' || type === 'casing'){
                    //Create the list of pipe evaluated
                    pipeElong_txt = childData.child('elongation').val() === null ? "" : childData.child('elongation').val()+" %";
                    newPipeRow = "<tr class='pipeSummaryRow'><td>"+childData.child('pipeNo').val()+"</td><td>"+childData.child('yieldstr').val()+"</td><td>"+pipeElong_txt+"</td><td>"+childData.child('diameter').val()+"</td><td>"+childData.child('wall').val()+"</td><td title='remove' data-key='"+childData.key+"'><i class='fa fa-trash-o ' aria-hidden='true'></i></td></tr>";
                    $('#tblPipe table').append(newPipeRow); 
                    
                    //Create an object with available methods. var calculationMethods { selectedForceValue: 10008080, available {"Cameron", "West", "DE" }}
                    if(cameronMethodAvailable){
                        calculationMethods.available.push("Cameron");
                    }
                    if(westMethodAvailable){
                        calculationMethods.available.push("West");                       
                    }
                    calculationMethods.available.push("DE");              
                    if(selectedMethod === "Cameron"){
                        calculationMethods.selectedForceValue = childData.child('CamForce').val();
                        calculationMethods.selectedForceInfo = "<p>Force (Cameron) = ppf x c3 x yield</p><p>"+childData.child('CamInfo').val()+"</p>";
                    }else if(selectedMethod === "West"){
                        calculationMethods.selectedForceValue = childData.child('WestForce').val();
                        calculationMethods.selectedForceInfo = "<p>"+childData.child('WestDef').val()+"</p><p>"+childData.child('WestInfo').val()+"</p>";
                    }else if(selectedMethod === "DE"){
                        calculationMethods.selectedForceValue = childData.child('DeForce').val();
                        calculationMethods.selectedForceInfo = "<p>"+childData.child('DeForceDef').val()+"</p><p>"+childData.child('DeForceInfo').val()+"</p>";
                    }
                    
                    //Construct the Pipe Force Approximation Table
                    calculationMethods.available.forEach(function(value){
                        visibleOption = value === preferredMethod ? value+"*" : value;
                        if(value === selectedMethod){
                            calcMethodOptionHTML += "<option value='"+value+"' selected>"+visibleOption+"</option>";
                        }else{
                            calcMethodOptionHTML += "<option value='"+value+"'>"+visibleOption+"</option>";
                        }
                    });
                    newPipeForce = "<tr data-key='"+childData.key+"'><td>"+childData.child('pipeNo').val()+"</td><td><select class='w3-select w3-padding-0'>"+calcMethodOptionHTML+"</select></td><td>"+calculationMethods.selectedForceValue+"</td><td>lbs</td><td class = 'expander'><i class='fa fa-chevron-down' aria-hidden='true'></i></td></tr>";
                    newPipeInfo = "<tr class='w3-small w3-hide'><td colspan='5'>"+calculationMethods.selectedForceInfo+"</td></tr>";
                    //Use this format
                    //<tr><td>1</td><td><select class="w3-select w3-padding-0"><option>West*</option><option>DE</option><option>Cameron</option></select></td><td>135,510</td><td>lbs</td><td><i class="fa fa-angle-down" aria-hidden="true"></i></td></tr>
                    //<tr><td colspan="5"><p>WEST force = A x B X C + D</p><p>135,510 = 1 x 1 x 135,000 + 510</p></td></tr>
                    tbl_forceApprox+=newPipeForce+newPipeInfo;
                    
                    //create shear pressures table
                    if(childData.child('OperatingPressure').val() !== null){
                        newPipePressure = "<tr><td>"+childData.child('pipeNo').val()+"</td><td>"+childData.child('OperatingPressure').val().toFixed(0)+"</td><td>psi</td><td class='expander'><i class='fa fa-chevron-down' aria-hidden='true'></i></td></tr>";
                        newPipePressureInfo = "<tr class='w3-small w3-hide'><td colspan='5'><p>"+childData.child('OperatingPressureDefinition').val()+"</p><p>"+childData.child('OperatingPressureEquation').val()+"</p></td></tr>";
                        tbl_pressureApprox+=newPipePressure+newPipePressureInfo;
                    }
                //TODO: Add wirelines to force approximations
                //create the wireline table
                }else{
                    newWireRow = "<tr class='wireSummaryRow'><td>"+childData.child('pipeNo').val()+"</td><td>"+childData.child('brkStrength').val()+" lbs</td><td>"+childData.child('diameter').val()+"</td><td data-key='"+childData.key+"'><i class='fa fa-trash-o ' aria-hidden='true'></i></td></tr>";
                    $('#tblWire table').append(newWireRow);
                }
                $('#approx_forces').html(tbl_forceApprox);
                $('#shear_pressures').html(tbl_pressureApprox);
            });
        });
    });
	
    //Add a pipe to the list to be evaluated.
    $("#addPipe").click(function(){
        var pipeNo, newPipeRow, pipeElong_txt, wire_brkStr, rev_brkStr, newPipedata, pipeGrade, testPipe, F_distEnergy, F_West,
        bopID, F_CAM, F_CAM_info, preferredEvalMethod, selectedEvalMethod, c3Request,
        pipeArea = null, pipeStrVal = null, ppf = null, isTube = false, evalYS = null,
        tubeType = $('#tube_type').val(),
        tubeStrengthType = $('#tubeStrengthType').val(),
        pipeODval = $('#pipe_od').val(),
        pipeElongVal = $('#pipe_elong').val(),
        pipeWallVal = $('#pipe_wall').val(),
        forceValues,
        pipe_data = {},
        pipeAddError = false;
        //reset the errors
        $('#pipe_wall').removeClass("w3-border-red");
        $('#pipe_od').removeClass("w3-border-red");
        $('#brStrength').removeClass("w3-border-red");

        //Error checks on tubular form
        if(pipeODval === ""){
            //show error
            $('#pipe_od').addClass("w3-border-red");
            pipeAddError = true;
        }
        if(tubeType === "pipe" || tubeType === "casing" || tubeType === "tubing"  ){
            isTube = true;
            if($('#pipe_wall').val() === ""){
                //show error
                $('#pipe_wall').addClass("w3-border-red");
                pipeAddError = true;
            }
        //TODO: if strength type is selected, then value should exist for yield.
        }else{
            if($('#brStrength').val() === ""){
                   //show error
                   $('#brStrength').addClass("w3-border-red");
                   pipeAddError = true;
            }
            pipeGrade = null; 
            pipeWallVal = null;
        }
        //if any errors are seen when adding, then exit the click handler
        if(pipeAddError){return;}

       //Get the user's new tubular data  
        if(isTube){//if it's a pipe,casing,or tube assign those values to be stored	   

            //if it's pipe use a pipe grade
            if(tubeType === "pipe"){
                pipeStrVal = $('#tubeStrengthType').val() === "grade" ? $('#tube_grade option:selected').val() : $('#pipe_minYS').val();
                pipeGrade = $('#tubeStrengthType').val() === "grade" ? $('#tube_grade option:selected').text() : null;    
            }else{ //if it's casing or tubing use casing/tubing grade
                pipeStrVal = $('#tubeStrengthType').val() === "grade" ? $('#casing_grade option:selected').val() : $('#pipe_minYS').val();
                pipeGrade = $('#tubeStrengthType').val() === "grade" ? $('#casing_grade option:selected').text() : null;
            }    

           pipeElong_txt = pipeElongVal.length === 0 ? "" : pipeElongVal+" %";
           pipeNo = $('#tblPipe tr').length;
           pipeArea = (Math.PI*(Math.pow(pipeODval,2)-Math.pow((pipeODval-(2*pipeWallVal)),2))/4).toFixed(2);
           //console.log("Area is: ",pipeArea);
           wire_brkStr = pipeStrVal * pipeArea;
        }else{
            pipeNo = $('#tblWire tr').length;
            wire_brkStr = $('#brStrength').val();
        }
        rev_brkStr = 100000000 - wire_brkStr;

        //determine if it's a test pipe.
        testPipe = $('#testPipe').data('value');

        //Determine Evaluation strength
        //if strength is selected, then use $('#pipe_minYS').val()
        //if grade is selected, then use the max yield, unless it's the test pipe,then use the min yield for the grade.
        if($('#tubeStrengthType').val()==='strength'){
            evalYS=$('#pipe_minYS').val();
        }else if($('#tubeStrengthType').val()==='grade'){
            if($('#testPipe').data('value')===true){
                //min yield for grade
                evalYS=gradeObj[$('#tube_grade option:selected').text()].min;
            }else{
                //max yield for grade
                evalYS=gradeObj[$('#tube_grade option:selected').text()].max;
            }
        }else{  //for wires
            evalYS=$('#brStrength').val();
        }

        forceValues = jQuery.extend({},Calculate_force(isTube, evalYS, pipeArea, pipeElongVal));
        if(forceValues.West_force){
            preferredEvalMethod = "West";
            selectedEvalMethod= "West";
        }else{
            preferredEvalMethod = "DE";
            selectedEvalMethod= "DE";
        }		   
        //add pipe to the database
        pipeElongVal = pipeElongVal.length === 0 ? null : pipeElongVal; 
        pipe_data = {
            pipeNo: pipeNo,
            type: tubeType,
            diameter: pipeODval,
            elongation: pipeElongVal,
            wall: pipeWallVal,
            area: pipeArea,
            strengthType: tubeStrengthType,
            grade: pipeGrade,
            yieldstr: pipeStrVal,
            brkStrength: wire_brkStr,
            brkStrength_sortDesc: rev_brkStr,
            testPipe: testPipe,
            evalStrength: evalYS,
            WestForce: forceValues.West_force,
            WestInfo: forceValues.West_info,
            WestDef: forceValues.West_def,
            DeForce: forceValues.DE_force,
            DeForceInfo: forceValues.DE_info,
            DeForceDef: forceValues.DE_def,
            preferredMethod: preferredEvalMethod,
            selectedMethod: selectedEvalMethod
        };
       console.log(pipe_data);
       newPipedata = newWorksheet.child('tubulars').push(pipe_data, function(){console.log('added pipedata for Pipe number ' + pipeNo);});

        //TODO: use function updateCamForces(tubeObj) after the ppf is updated.
        //add the pipe weight for tubes
        if(isTube){
             $.get("include/pipe_weight.php?od="+pipeODval+"&wall="+pipeWallVal+"&type="+tubeType, function(weight){
                 if($('#OEM_select option:selected').text()==='Cameron' && (pipeGrade || evalYS)){//TODO: Update to work for casing/tubing grade or for a specified yield
                     bopID = $('#BOP_select').val();
                     if(pipeGrade){c3Request = "include/C3.php?bop_id="+bopID+"&pipe_grade="+pipeGrade+"&pipe_od="+pipeODval;
                     }else if(evalYS){c3Request = "include/C3.php?bop_id="+bopID+"&pipe_yield="+evalYS+"&pipe_od="+pipeODval;}
                    $.get(c3Request, function(c3){
                        F_CAM = weight*c3*evalYS;  //force in lbs
                        F_CAM_info = F_CAM.toFixed(0)+" = "+weight+" x "+c3+" x "+evalYS;
                        newPipedata.update({
                            preferredMethod: "Cameron",
                            selectedMethod: "Cameron",
                            ppf: weight, 
                            CamForce: F_CAM.toFixed(0), 
                            CamInfo: F_CAM_info,
                            C3: c3});    
                    }).fail(function(err){
                        console.log("Error getting c3 value with request: "+c3Request+" Error msg: "+err);
                    });
                }else{
                        newPipedata.update({ppf: weight});
                        //console.log('OEM: '+$('#OEM_select option:selected').text()+'pipeGrade: '+pipeGrade); //testing
                }
            }).fail(function(err){console.log("Error getting pipe weight from include/pipe_weight.php: "+err);});
        }

        //Reset the tubular form
        $("#tube_type>option[value='pipe']").prop("selected",true);
        $("#tubeStrengthType>option[value='grade']").prop("selected",true);
        $("#tube_grade>option[value='75000']").prop("selected",true);
        $("#tube_type").change();
        $('#pipe_od').val("");
        $('#pipe_wall').val("");
        $('#pipe_elong').val("");
        $('#brStrength').val("");
        $('#pipe_minYS').val("");
        $('#testPipe').removeClass('w3-blue').addClass('w3-opacity').data('value',false).html('Test Pipe');
    });
    
    /*
     * Surface Subsea configuration
     */
    $('#rigBOPLoc').change(function(){
       if($('#rigBOPLoc').val() === 'surface'){
           $('.rigSurface').removeClass('w3-hide');
           $('.rigSubsea').addClass('w3-hide');
       }else{
           $('.rigSubsea').removeClass('w3-hide');
           $('.rigSurface').addClass('w3-hide');
       } 
    });
    
    /*
     * Update Rig Info in database
     */
    $('#rigName, #rigBOPLoc').change(function(){
        newWorksheet.update({
            Rig: {
                name: $('#rigName').val(),
                bopLocation: $('#rigBOPLoc').val()
            }
        });
    });
})
//Remove the pipe from firebase.  Register for all new .fa-trash-o  classes added
.on('change', '#masp, #mawhp, #g_cf, #g_sw, #mudweight, #h_bop, #h_sw, #h_riser, #rigHPUelevation, #rigBOPLoc',function(){
        
        display_results();
 })
.on('click', 'table .fa-trash-o ',function(){
   "use strict";
    //Get the key value from the row attribute.
    var key = $(this).parent().attr('data-key');
    
    //Remove the key for this pipe row from firebase.
    newWorksheet.child('tubulars/'+key).remove().then(function(){
        console.log("removed key:" + key);    
    });
})
//When OEM is changed or (the BOP model is changed and it's Cameron OEM), add or remove the cameron force from the pipe database
.on('change', '#OEM_select, #BOP_select', function(){
   		console.log('OEM/model changed');
   		var fb_tubulars = newWorksheet.child('tubulars');
		fb_tubulars.once('value', function(snapshot) {
			snapshot.forEach(function(childSnapshot){
				updateCamForces(childSnapshot);
			});
		});
                
                //TODO: add the Closing Area, Closing Ratio, Tailrod Area, & MOPFLPS to firebase
                BOPdataToFireBase();

 })
.on('change','#bop_closingarea, #bop_closingratio, #bop_trarea, #bop_MOPFLPS', function(){
    BOPdataToFireBase();
    display_results();
 })
 //When a new calculation method is selected, update the force.
.on('change','#approx_forces select', function(){ 
    //get the key of the pipe from firebase of the pipe being evaluated
    var key = $(this).parent().parent().attr('data-key');
    //get the method that was just selected
    var selectedMethodName = $(this).val();
    console.log(selectedMethodName);
    //Update the selected method in the firebase db
    newWorksheet.child('tubulars').child(key).ref.update( {selectedMethod: selectedMethodName});
})
//Expandable tool tips
//Hide the section below the #expander arrow.  The hidden section is a sibbling of the arrow's parent.
.on('click', '.expander', function(){
        var currentRow = $(this).parent(), allChildren = currentRow.parent().children(), 
        currentRowIndex=allChildren.index(currentRow),
        showRowIndex = currentRowIndex + 2;  //this will show the next child in a non-0 indexed list
        //allChildren.addClass('w3-red');
        //currentRow.addClass('w3-green');

        $(this).parent().parent().children(":nth-child("+showRowIndex+")").toggleClass("w3-hide");
        if($(this).html()===' <i class="fa fa-chevron-up" aria-hidden="true"></i> '){
            $(this).html(' <i class="fa fa-chevron-down" aria-hidden="true"></i> ');
        }else{$(this).html(' <i class="fa fa-chevron-up" aria-hidden="true"></i> ');}
    });;

function Calculate_force(isTube, strength, area, pipe_elong) {
    /*Function Calculates the shear force in lbs for a given pipe size.  
    * It attempts to use 2 different methods: Distortion Energy &  West
    * The following values are returned:  calculate_shear().West_force & .DE_force
    * A successful evaluation will return a numerical values.  Unsuccesful evaluation will return false.
    * 
    * isTube = true/false ; true if casing, pipe, or tubing
    * The Cameron Force is evaluated when the pipe weight is available. See process_ppf() which is called in display_results(); 
    * This is done because the Cameron force is dependant on two calls to the database.  One for the ppf of the pipe, the other for the C3 value of the operator/pipe combo.
    *
    */
    "use strict";
    area = (typeof area !== 'undefined') ?  area : false;
    pipe_elong = (typeof pipe_elong !== 'undefined') ?  pipe_elong : false;
    var method = "", A, B, C, Stdev, R2, WestForce, WestEquationStr, strengthConcat,
        ForceValues = {},
        min_YS = strength;
    
    if(typeof strength === "string"){
        strengthConcat = parseFloat(strength).toFixed(0);
    } else{
        strengthConcat = strength.toFixed(0);
    }

    if(isTube && area){
            
            //Use distortion energy regarless of elongation for comparison
            ForceValues.DE_force = (0.577 * area * strength).toFixed(0);
            ForceValues.DE_info =     "0.577 x "+area+" x "+strengthConcat;
            ForceValues.DE_def = "0.577 x area x yield";
            //if elongation is present use west w/ elongation
            if(pipe_elong){
                //The following values are given by a WEST engineering report generated for MMS
                //if ys is >=75ksi <105 use C=-234 A=-0.318 B=25.357 R2=.359 Stdev=62.03
                //if ys is >=105ksi <135 use C=181.33 A=.396 B=2.035 R2=.121 Stdev=62.89
                //if ys >=135 <165ksi use C=-35.11 A=.630 B=4.489 R2=.3 Stdev=76.69
                //else C=35.28 A=.427 B=6.629 R2=.231 Stdev=75.15
                if (strength >= 75000 && strength < 105000){
                    C = -234;
                    A = -0.318;
                    B = 25.357;
                    R2 = 0.359;
                    Stdev = 62.03;
                }
                else if (strength >= 105000 && strength < 135000){
                    C = 181.33;
                    A = 0.396;
                    B = 2.035;
                    R2 = 0.121;
                    Stdev = 62.89;
                }
                else if (strength >= 135000 && strength < 200000){
                    C = -35.11;
                    A = 0.630;
                    B = 4.489;
                    R2 = 0.3;
                    Stdev = 76.69;
                }
                else {
                    C = 35.28;
                    A = 0.427;
                    B = 6.629;
                    R2 = 0.231;
                    Stdev = 75.15;
                }
                WestForce = C + A * 0.577 * strength * area + B * pipe_elong + (2 * Stdev);
                WestEquationStr = C+" + "+A+" x 0.577 x "+area+" x "+strengthConcat+" + "+B+" x "+pipe_elong+" + (2 x "+Stdev+")";
                ForceValues.West_force=WestForce.toFixed(0);
                ForceValues.West_info= ForceValues.West_force+" = "+WestEquationStr;
                ForceValues.West_def = "Force (West) = "+C+" + "+A+" x 0.577 x area x yield + "+B+" x elongation + (2 x "+Stdev+")";
            }else{ //west w/o distortion 
                ForceValues.West_force = (ForceValues.DE_force * 1.045).toFixed(0);
                WestEquationStr = " 0.577 x "+area +" x "+strengthConcat+" x 1.045";
                ForceValues.West_info= ForceValues.West_force+" = "+WestEquationStr;
                ForceValues.West_def = "Force (West) = 0.577 x area x yield x 1.045";
            }
        }else{ //calc shear force based on breaking strength
            ForceValues.West_force=false;
            ForceValues.West_info=false;
            ForceValues.West_def = false;
            ForceValues.DE_force = (0.577 * strength).toFixed(0);  //in this case the strength is a breaking force, not a yield (pressure)
            ForceValues.DE_info = "0.577 x "+strengthConcat;
            ForceValues.DE_def = "0.577 x breaking strength";
        }
    //console.log(`isTube: ${isTube}, area: ${area}, strength: ${strength}, pipe_elong: ${pipe_elong}`); 
    return ForceValues;
}
function display_ssc_save(xhttp) {
    "use strict";
	var response = xhttp.responseText, link;
	if (isNumeric(response)){
	   link = "http://50.201.150.115/Compliance/?page=calcs&sub=ssc&save="+response;
	   $('#save_link').html("<a href="+link+">"+link+"</a>");
	}
	else{//the response may be an error if it is not numeric.
		alert(response);
	}
}
function getShareLink(){
	
	if (validateForm()){
		//create link
		//read each field and assign it to a variable.
		//Select or Specify
		var theForm = document.forms["sheardata"],
            Pipe_choice = theForm.elements["Pipe_select"][1].checked == true?"specify":"select";
		//Pipe grade
		if(document.contains(document.getElementById('pipe_grade'))){  //If a pipe grade has been selected
			var grade_option = document.getElementById("pipe_grade").options,
                grade_index = document.getElementById("pipe_grade").selectedIndex,
                pipe_grade = grade_option[grade_index].text;
		}
		else{ var pipe_grade = false;}
		//Min. Yield Strength
		var min_YS = check_form_field('pipe_minYS',"");
		var POST_min_YS = min_YS ? "minYS=" + min_YS : "";
		//Yield Strength
		var ys = check_form_field('pipe_ys',"");
		var POST_ys = ys ? "ys="+ys : "";
		//Ultimate Strength
		var UTS = check_form_field('pipe_uts',"");
		var POST_UTS = UTS ? "uts="+UTS : ""; 
		//%Elongation
		var elong = check_form_field('pipe_elong',"");
		var POST_elong = elong ? "elong="+elong:"";
		//Outside Diameter
		var od = check_form_field('pipe_od',""); 
		var POST_od = od ? "od="+od:"";
		//Wall Thickness
		var wall = check_form_field('pipe_wall',"");
		var POST_wall = wall ? "wall="+wall : "";
		
		//WELL INFO
		//MAWHP
		var MAWHP = check_form_field('mawhp',"");
		var POST_MAWHP = MAWHP ? "MAWHP="+MAWHP : "";
		//Height of Riser
		var h_riser = check_form_field('h_riser',"");
		var POST_h_riser = h_riser ? "h_riser="+h_riser : "";
		//Water depth
		var h_sw = check_form_field('h_sw',"");
		var POST_h_sw = h_sw ? "h_sw="+h_sw : "";
		//Height of HPU
		var h_hpu = check_form_field('rigHPUelevation',"");
		var POST_h_hpu = h_hpu ? "h_hpu="+h_hpu : "";
		//Height of BOP
		var h_bop = check_form_field('h_bop',"");
		var POST_h_bop = h_bop ? "h_bop="+h_bop :"";
		//MUD weight
		var mudweight = check_form_field('mudweight',"");
		var POST_mudweight = mudweight ? "mudweight="+mudweight : "";
		//Control fluid gradient
		var grad_cf = check_form_field('g_cf',"");
		var POST_grad_cf = grad_cf ? "grad_cf="+grad_cf : "";
		//Seawater gradient
		var grad_sw = check_form_field('g_sw',"");
		var POST_grad_sw = grad_sw ? "grad_sw="+grad_sw : "";
		
		//BOP INFO
		var post_BOP_info = "";
		
		//closing area, closing_ratio, and tailrod_area exist whether a BOP was selected or specified.  While we could look up the values if a model was selected, the lookup would not record user changes
		// Therefore we include it so and variations the user has made to the BOP model can be recorded.
		var closing_area = check_form_field('bop_closingarea',""); 
		var closing_ratio = check_form_field('bop_closingratio',"");
		var tailrod_area = check_form_field('bop_trarea',"");
		//if Specify BOP
		if(theForm.elements["BOP_select"][1].checked == true){//"Specify was selected"
			var BOP_choice = "specify";

			post_BOP_info = "bop_closingarea="+closing_area+"&bop_closingratio="+closing_ratio+"&bop_trarea="+tailrod_area+"&bop_choice="+BOP_choice;
		}
		//if Select BOP
		else{
			var BOP_choice = "select";
			//OEM, Model  //the closing_area, closing_ratio, tailrod_area can be determined by the model
			//var OEM_index = document.getElementById("OEM_select").selectedIndex;
			var OEM_element = document.getElementById("OEM_select");
			var OEM_index = OEM_element.options[OEM_element.selectedIndex].value;
			if(document.contains(document.getElementById('BOP_select'))){  //Checks that the Model dropdown is visible.
				//var BOP_index = document.getElementById("BOP_select").selectedIndex;
				var BOP_element = document.getElementById("BOP_select");
				var BOP_index = BOP_element.options[BOP_element.selectedIndex].value;
			}
			post_BOP_info += "bop_closingarea="+closing_area+"&bop_closingratio="+closing_ratio+"&bop_trarea="+tailrod_area+"&bop_choice="+BOP_choice+"&OEM="+OEM_index+"&BOPmodel="+BOP_index;
		}
		
		//create a url to send to a phpscript  It's long, so I'll prob need $_POST var
		//if pipe is specified
		if(Pipe_choice=="specify"){
			var post_form_data = "pipechoice="+Pipe_choice+"&gr_index="+grade_index+"&"+POST_min_YS+"&"+POST_ys+"&"+POST_UTS+"&"+POST_elong+"&"+POST_od+"&"+POST_wall;	
		}
		else{//if pipe is selected
			var post_form_data = "pipechoice=" + Pipe_choice;
		}
		//Well Data
		post_form_data += "&"+POST_MAWHP+"&"+POST_h_riser+"&"+POST_h_sw+"&"+POST_h_hpu+"&"+POST_h_bop+"&"+POST_mudweight+"&"+POST_grad_cf+"&"+POST_grad_sw;
		//BOP info
		post_form_data += "&"+post_BOP_info;
		
		// "&&" will appear where POST variable have not been entered.  This while statement removes those duplicate &'s
		while (post_form_data.includes("&&")){  //includes is not compatible with older browsers.
			post_form_data = post_form_data.replace("&&","&");	
		}
		
		//$_POST sent to Call_ajax()
		// pipechoice => string "specify"|"select" 
		// gr_index = int index number of the pipe grade
		// minYS => int(6)
		// ys => int(6)
		// uts => int(6)
		// elong => decimal (4,2)
		// od => decimal (4,2)
		// wall => decimal (6,4)
		// MAWHP => int(6)
		// h_riser, h_sw, h_hpu, h_bop = decimal (7,2)
		// mudweight => decimal(4,2)
		// bop_choice => string "specify"|"select"
		// OEM => int(3)
		// BOPmodel => int(4)
		// grad_cf => decimal(6,4)
		// grad_sw => decimal(6,4)
		
		//php script resonse should be the id of the newly created row
		Call_ajax("ShearCalculator/save_ssc_form.php",display_ssc_save, "POST",post_form_data);
	}
}

function load_form_fields(){
	//functions will display fields for selected options by default.  This is generally called on page load.
	BOP_fields();
	pipe_fields();
}

function evaluation_YS(){
	//Determine Evaluation Yield.
	// Preferred strength  UTS > Actual ys/.85 > Max spec YS
	var UTS = check_form_field('pipe_uts',false);
	var ys = check_form_field('pipe_ys',false);
	
	//get grade
	if(document.contains(document.getElementById('pipe_grade'))){  //If a pipe grade has been selected
			var grade_option = document.getElementById("pipe_grade").options;
			var grade_index = document.getElementById("pipe_grade").selectedIndex;
			var pipe_grade = grade_option[grade_index].text;
	}
	else{ var pipe_grade = false;}
		
	if (UTS){eval_yield=UTS/1000;}
	else if(ys){eval_yield=ys/(0.85 * 1000);}
	else{ //pipe_grade -> E75, L80, X95, G105, P110, Q125, S135, Z140, V150
		if(pipe_grade === "E75"){eval_yield=105;}
		else if(pipe_grade === "L80") {eval_yield=110;}  //UPDATE. assumed 110ksi max
		else if(pipe_grade === "X95") {eval_yield=125;}
		else if(pipe_grade === "G105") {eval_yield=135;}
		else if(pipe_grade === "P110") {eval_yield=140;} //UPDATE. assumed 140ksi max
		else if(pipe_grade === "Q125") {eval_yield=155;} //UPDATE.  assumed 155ksi max 
		else if(pipe_grade === "S135") {eval_yield=165;}
		else if(pipe_grade === "Z140") {eval_yield=160;}  //Ref. Grant Prideco
		else if(pipe_grade === "V150") {eval_yield=180;} //Ref. Grant Prideco
	}  
	return eval_yield;
}

function get_minYS(){
		// get_minYS will return the value provided in the form if available
		// otherwise it will provide the pipe grade selected
		// if none are available it will return false.
		var form_ys = check_form_field('pipe_minYS',false);
		
		// get a value for the grade 
		var grade_element = document.getElementById("pipe_grade");
        var grade_ys = grade_element.options[grade_element.selectedIndex].value;
        
		// if the minYS is not available use grade_ys
		if(form_ys){
			var ys=form_ys;
		}
		else if(grade_ys){
			var ys=grade_ys;
		}
		else{var ys=false;}
		
		return ys;
}

function calculateArea() {
	var area, od = check_form_field('pipe_od',false),
        wall = check_form_field('pipe_wall',false);
	//if (outside == null || outside == "" || isNaN(outside)) {outside=0;}
	//if (wall ==null || wall == "" || isNaN(wall)) {wall = 0;}
	if (od){
		if (!wall){inside=0;} else{ var inside = od - (2 * wall);}
		area = Math.PI * (Math.pow(od,2) - Math.pow(inside,2)) / 4;
		return area;
	}
	else{ return false;}
}

function pipe_fields(){
    // change pipe selction method based on radio buttons
    var divobj = document.getElementById("pipe_values");
    var theForm = document.forms["sheardata"];
    var Pipe_choice = theForm.elements["Pipe_select"];
    var BOP_OEM = "";
    
    //UPDATE NEEDED.  Check for previous form values.  Use values in form or insert blank. 
    //Note Initial pipe grade.
    if(document.getElementById("pipe_grade")){var init_pipegrade = document.getElementById("pipe_grade").selectedIndex;}
    
    //UPDATE NEEDED.  Selecting pipe grade changes min YS.  New function needed
    var od = check_form_field('pipe_od',"");
    var wall = check_form_field('pipe_wall',"");
    var ys = check_form_field('pipe_ys',"");
    var elong = check_form_field('pipe_elong',"");
    var minYS = check_form_field('pipe_minYS',"");
    var uts = check_form_field('pipe_uts',"");
    
	//list all rows for Specifying pipe. 
	var pipe_form_od = "<div class=\"w3-row\"><div class=\"w3-col l3 m4 s4\">Outside Diameter</div><div class=\"w3-col l3 m4 s4\"><input type=\"text\" name=\"pipe_od\" id=\"pipe_od\" onkeyup=\"display_results()\" value=\""+od+"\" class=\"w3-input w3-padding-0\"/></div><div class=\"w3-col l1 m1 s1 w3-margin-left\">in</div></div>";
	var pipe_form_wt = "<div class=\"w3-row\"><div class=\"w3-col l3 m4 s4\">Wall Thickness</div><div class=\"w3-col l3 m4 s4\"><input type=\"text\" name=\"pipe_wall\" id=\"pipe_wall\" onkeyup=\"display_results()\" value=\""+wall+"\" class=\"w3-input w3-padding-0\"/></div><div class=\"w3-col l1 m1 s1 w3-margin-left\">in</div></div>";
	var pipe_form_area = "<div class=\"w3-row\"><div class=\"w3-col l3 m4 s4\">Area</div><div class=\"w3-col l3 m4 s4 w3-right-align w3-grey\" id=\"pipe_area\">[INPUT REQUIRED] </div><div class=\"w3-col l1 m1 s1 w3-margin-left\">in<sup>2</sup></div></div>";
	var pipe_form_yield = "<div class=\"w3-row\"><div class=\"w3-col l3 m4 s4\">Yield Strength</div><div class=\"w3-col l3 m4 s4\"><input type=\"text\" id=\"pipe_ys\" onkeyup=\"display_results()\" value=\""+ys+"\" class=\"w3-input w3-padding-0\"/></div><div class=\"w3-col l1 m1 s1 w3-margin-left\">psi</div></div>";
	var pipe_form_uts = "<div class=\"w3-row\"><div class=\"w3-col l3 m4 s4\">Ultimate Strength</div><div class=\"w3-col l3 m4 s4\"><input type=\"text\" id=\"pipe_uts\" onkeyup=\"display_results()\" value=\""+uts+"\" class=\"w3-input w3-padding-0\"/></div><div class=\"w3-col l1 m1 s1 w3-margin-left\">psi</div></div>";
	var pipe_form_el = "<div class=\"w3-row\"><div class=\"w3-col l3 m4 s4\">% Elongation</div><div class=\"w3-col l3 m4 s4\"><input type=\"text\" id=\"pipe_elong\" onkeyup=\"display_results()\" value=\""+elong+"\" class=\"w3-input w3-padding-0\"/></div><div class=\"w3-col l1 m1 s1 w3-margin-left\">%</div></div>";
	var pipe_form_ppf = "";
	var pipe_grade ="<div class=\"w3-row\"><div class=\"w3-col l3 m4 s4\">Pipe Grade</div><div class=\"w3-col l3 m4 s4\"><select id=\"pipe_grade\" onchange=\"display_results()\" class=\"w3-select\"><option value=\"75000\">E75</option><option value=\"80000\">L80</option><option value=\"95000\">X95</option><option value=\"105000\">G105</option><option value=\"110000\">P110</option><option value=\"125000\">Q125</option><option value=\"135000\">S135</option><option value=\"140000\">Z140</option><option value=\"150000\">V150</option></select></div></div>";
	var pipe_form_minYS = "<div class=\"w3-row\"><div class=\"w3-col l3 m4 s4\">Min. Yield Strength</div><div class=\"w3-col l3 m4 s4\"><input type=\"text\" id=\"pipe_minYS\" onkeyup=\"display_results()\"  class=\"w3-input w3-padding-0\"value=\""+minYS+"\"/></div><div class=\"w3-col l1 m1 s1 w3-margin-left\">psi</div></div>";
	//Check if Cameron is selected as OEM.  If so, include pipe weight
	if(document.contains(document.getElementById('OEM_select'))){  //If an OEM has been selected
		BOP_OEM_option = document.getElementById("OEM_select").options;
		OEM_index = document.getElementById("OEM_select").selectedIndex;
		BOP_OEM = BOP_OEM_option[OEM_index].text;
		if (BOP_OEM == "Cameron"){
			pipe_form_ppf = "<div class=\"w3-row\"><div class=\"w3-col l3 m4 s4\">Pipe weight</div><div class=\"w3-col l3 m4 s4 w3-right-align\" id=\"pipe_ppf\"></div><div class=\"w3-col l1 m1 s1 w3-margin-left\">ppf</div></div>";
			//pipe_form_uts = "";
		}
	}
		
	//CHANGED TO jQUERY - if (Pipe_choice[1].checked) { 
	if ($('input[name=Pipe_select]:checked').val()=='specify') {
		//Specify.  
        //CHANGED TO jQUERY - divobj.innerHTML = pipe_grade + pipe_form_minYS + pipe_form_yield + pipe_form_uts + pipe_form_el + pipe_form_od + pipe_form_wt + pipe_form_area + pipe_form_ppf;
        $('#pipe_values').html(pipe_grade + pipe_form_minYS + pipe_form_yield + pipe_form_uts + pipe_form_el + pipe_form_od + pipe_form_wt + pipe_form_area + pipe_form_ppf);
        //maintain the pipe grade
        if(init_pipegrade){document.getElementById("pipe_grade").selectedIndex = init_pipegrade;}
    } 
    else{ //Select
        //CHANGED TO jQUERY - divobj.innerHTML = "<div class=\"w3-row\"><div class=\"w3-col l4 m4 s4\">Not yet availabe.</div><div class=\"w3-col l4 m4 s4\">dropdown</div></div>";
        $('#pipe_values').html("<div class=\"w3-row\"><div class=\"w3-col l4 m4 s4\">Not yet availabe.</div><div class=\"w3-col l4 m4 s4\">dropdown</div></div>");    
    }    
}

function calc_grad(x) {
	"use strict";
	// x value is given in pounds per gallon
	// y is returned in psi per ft of depth
	var y=x*12/231;
	return y;
}

/*
function BOP_fields() {
    /* this has been moved to shear.js.php because it needs to access database info with php
}

*/
function Calc_all() {
	
	//assign variables from user input.
	/*MISSING  need to add validation of form fields.  Is number.  Not empty*/
	var isSubsea = ($('#rigBOPLoc').val()==='subsea') ? true : false, 
        masp = $('#masp').val(), head_sw, head_cf,
        mawhp = $('#mawhp').val(),
        h_riser = $('#h_riser').val(),
        h_sw = $('#h_sw').val(),
        h_hpu = $('#rigHPUelevation').val(),
        h_bop = $('#h_bop').val(),
        mudweight = $('#mudweight').val(),
        g_cf = $('#g_cf').val(),
        g_sw = $('#g_sw').val(),
	//calculate mud pressure at depth
	   mudPressure = calc_grad( +mudweight ) * (+h_sw + (+h_riser) - +h_bop);
	
	//determine if MUD or MASP/MAWHP is greater
	if(isSubsea){
	    //calculate fluid head pressure
        head_sw = +g_sw * (+h_sw - +h_bop); //seawater head at specified water depth "+" added to convert var to number
        head_cf = +g_cf * (+h_sw - +h_bop + (+h_hpu)); //control fluid head at water depth
        if (mudPressure > mawhp) {
            P_well = mudPressure;
            Ptype_well = "MUD";
        } else {
            P_well = mawhp;
            Ptype_well = "MAWHP";
        }
    }else{
        head_sw = 0; //seawater head at specified water depth "+" added to convert var to number
        head_cf = 0; //control fluid head at water depth
        P_well = masp;
        Ptype_well = "MASP";
    }				

	//set the variables for the BOP type
    var bop_closingarea = check_form_field('bop_closingarea'), // Closing Area = Ac
        bop_closingratio = check_form_field('bop_closingratio'), // Closing ratio = Cr
        bop_trarea = check_form_field('bop_trarea'),
	
    //get Pressure of seawater at depth
    //calc opening area = Ac + At - Ac/Cr
    bop_openingarea = bop_closingarea + bop_trarea - (bop_closingarea/bop_closingratio),

    //calculate opening force dues to seawater against operator = Psw x Ao
    ForceO_sw = head_sw * bop_openingarea,

    //get Pressure of control fluid at depth = Pcf
    //calculate force of control fluid on closing side = Pcf x Ac
    ForceC_cf = head_cf * bop_closingarea,

    //calculate closing force on the tailrod due to seawater = Psw x At
    ForceC_tr = head_sw * bop_trarea,

    //determine adjustment in closing force due to hydrostatics
    P_adjust_hyd = isSubsea ? ((( ForceO_sw - ForceC_cf - ForceC_tr ) / bop_closingarea)) + ( P_well / bop_closingratio ): P_well / bop_closingratio,
    //output_str = 'Force0_sw = '+ForceO_sw+', ForceC_cf = '+ForceC_cf+', ForceC_tr = '+ForceC_tr+', bop_closing_area = '+bop_closingarea+', P_well = '+P_well+', bop_closingratio = '+bop_closingratio+', P_adjust_hyd = '+P_adjust_hyd;
    output_str = 'ForceC_cf = '+ForceC_cf+', head_sw ='+head_sw+', bop_trarea='+bop_trarea+', ForceC_tr = '+ForceC_tr+', P_adjust_hyd = '+P_adjust_hyd;
    console.log(output_str);

    //return values to be displayed
    var Pressures = {};
            Pressures["Press_well"] = P_well;
            Pressures["Press_type"] = Ptype_well;
            Pressures["Press_head_sw"] = head_sw;  
            Pressures["Press_head_cf"] = head_cf;
            Pressures["Press_adj"] = P_adjust_hyd;
    return Pressures;
}

function Call_ajax(url,cfunc,type,data){
	//type = "POST", "GET"
	//data = used for "POST"
	if (window.XMLHttpRequest) {
        // code for IE7+, Firefox, Chrome, Opera, Safari
        var xmlhttp = new XMLHttpRequest();
    } else {
        // code for IE6, IE5
        var xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
            cfunc(xmlhttp);
        }
    };
    if (type === "POST"){
    	xmlhttp.open("POST", url, true);
		xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xmlhttp.send(data);
    }
    else{
    	xmlhttp.open("GET",url,true);
    	xmlhttp.send();	
    }
    
}

function Cameron_shear(od,grade,bop_id,ppf) {
	
	//Generate a force using Cameron's EB 702D.  The following must be available.
	// C3, Cameron BOP, ppf
	// this function is only called after ppf is pulled from the database
	// this function uses od, grade, and bop_id to determine the C3 value
	// once the C3 value is pulled from the database a value is returned in the results table.
	
	ppf = check_value_isNumber(ppf,3,false);
	var bop_closingarea = check_form_field('bop_closingarea');
	
    if (window.XMLHttpRequest) {
        // code for IE7+, Firefox, Chrome, Opera, Safari
        var xmlhttp = new XMLHttpRequest();
    } else {
        // code for IE6, IE5
        var xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
            var C3 = xmlhttp.responseText;
            var ys = get_minYS();
            CameronForce = parseFloat(ppf * C3 * ys / 1000).toFixed(1);
            CameronPressure = (CameronForce * 1000) / bop_closingarea + Calc_all().Press_adj;
            Cameron_info = "C3 = "+C3+"&#x0D Cameron Force = "+ppf+" * "+C3+" * "+ys+" / 1000";
            document.getElementById("Fcam").innerHTML = "<td>F-Cameron <span title=\""+Cameron_info+"\"><span class=\"fa fa-info-circle w3-small\"></span></span></td><td>"+CameronForce+"</td><td>kips</td>";
 			
 			//Display the Shear Pressure as calculated using Cameron force.
            document.getElementById("final_pressure").innerHTML = check_value_isNumber(CameronPressure,1);
            document.getElementById('final_pressure_row').className = ""; //clear any error notification
            document.getElementById("final_P_info").title= "Cameron Shear Pressure = ("+check_value_isNumber(CameronForce,0)+" * 1000) / "+bop_closingarea+" + "+check_value_isNumber(Calc_all().Press_adj,2);
        }
    };
    xmlhttp.open("GET","include/c3.php?bop_id="+bop_id+"&pipe_grade="+grade+"&pipe_od="+od,true);
    xmlhttp.send();
}

function process_ppf(xhttp) {
	document.getElementById("pipe_ppf").innerHTML = xhttp.responseText;
	
	var ppf = check_value_isNumber(xhttp.responseText,3,false);
	var od = check_form_field('pipe_od',false);
	
	//get grade
	if(document.contains(document.getElementById('pipe_grade'))){  //If a pipe grade has been selected
			var grade_option = document.getElementById("pipe_grade").options;
			var grade_index = document.getElementById("pipe_grade").selectedIndex;
			var pipe_grade = grade_option[grade_index].text;
	}
	else{ var pipe_grade = false;}
	
	//get bop_id
	if(document.contains(document.getElementById('BOP_select'))){  //If a bop has been selected
		var BOP_option = document.getElementById("BOP_select").options;
		var BOP_index = document.getElementById("BOP_select").selectedIndex;
		var BOP_id = BOP_option[BOP_index].value;
		}
	else{ var BOP_id = false;}
		
	if (od && BOP_id && pipe_grade){
			Cameron_shear(od,pipe_grade,BOP_id,ppf);
	}
}

function validateForm() {
	//checks that a shear value has been calculated before generating a valid link.
    var x = check_html_text('final_pressure',false);
    if (!x) {
         
        document.getElementById('warn_validate').style.display='block';
                
        //change class on shear pressure to show missing info;
        document.getElementById('final_pressure_row').className += "w3-border-red w3-leftbar";
        //disable button
        $("#get_link").prop('disabled',true).attr('title',"Pipe, Well, and BOP data are required to get link.");
        return false;
    }
    return true;
}
