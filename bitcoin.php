<?php

$url = "https://www.bitstamp.net/api/ticker";
$fgc = file_get_contents($url);
$json = json_decode($fgc,true);
 $price = $json["last"];
 $high = $json["high"];
 $low = $json["low"];
 $date = date('m-d-y - h:i:sa');
 $open = $json["open"];

 if($open < $price){
     // when price goes up
     $indicator = "+";
     $change = $price - $open;
     $percent = $percent * 100;
     $percentChange = $indicator.number_format($percent,2);
     $color = "#16226f";
 }

 if($open > $price){
     // if the price goes down
     $indicator ="-";
     $change = $open - $price;
     $percent = $change/$open;
     $percent = $percent * 100;
     $percentChange = $indicator.number_format($percent,2);
     $color = "16226f";
 }
?>

<html>
<head>
    <title>My Bitcoin Widget</title>
    <style>
        #container {
            width: 600px;
            height: 400px;
            border: 1px solid #000;
            background-color: #ECF3EE;
            overflow: hidden;
            border-radius: 3px;
            color: #fefdfb;
        }    

        #lastprice{
            font-size: 30px;
        }

        #timeDate{
            color: #999;
            font-size: 9px;
        }
    </style>
</head>
<body>
    <div id="container">
        <table width="100%">
            <tr>
                <td rowspan="3" width="60%" id="lastprice">Price: <?php echo $price; ?></td>
            </tr>
            <tr>
                <td rowspan="3" width="60%">PercentChange: <?php echo $percentChange; ?>%</td>
            </tr>
            <tr>
                <td rowspan="3" width="60%">High Value: <?php echo $high; ?></td>
            </tr>
            <tr>
                <td rowspan="3" width="60%">Low Value: <?php echo $high; ?></td>
            </tr>
            <tr>
                <td colspan="2" align="right" id="timeDate"><?php echo $date; ?></td>
            </tr>
        </table>
    </div>
</body>
</html>