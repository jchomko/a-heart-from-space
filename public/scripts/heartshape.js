var heartShape = [
  { x: -4.898587196589413e-16, y: -4.0 },
  { x: -0.2534402928868796, y: -3.9879281657745635 },
  {
    x: -0.5043328943285782,
    y: -3.951858327057947
  },
  { x: -0.750164944381149, y: -3.8922253275414853 },
  { x: -0.9884927104626274, y: -3.8097467798624978 },
  {
    x: -1.2169748204516155,
    y: -3.705412493012949
  },
  { x: -1.4334039228027673, y: -3.580469904137215 },
  { x: -1.6357362884701006, y: -3.436405743657764 },
  {
    x: -1.822118902150452,
    y: -3.2749242217500725
  },
  { x: -1.990913630265714, y: -3.097922078664248 },
  { x: -2.1407180995533546, y: -2.9074608903903925 },
  {
    x: -2.270382972385287,
    y: -2.705737063904886
  },
  { x: -2.3790253621472317, y: -2.4950499920338824 },
  { x: -2.4660381932670092, y: -2.277768866257475 },
  {
    x: -2.5310953747982925,
    y: -2.056298666103853
  },
  { x: -2.57415272281534, y: -1.833045855824974 },
  { x: -2.5954446341903643, y: -1.6103843226152308 },
  {
    x: -2.5954765815299354,
    y: -1.3906220856792546
  },
  { x: -2.575013565063295, y: -1.1759692920584874 },
  { x: -2.535064721046505, y: -0.9685079935079888 },
  {
    x: -2.476864346750918,
    y: -0.7701641692267167
  },
  { x: -2.4018496583744935, y: -0.5826824223639309 },
  { x: -2.3116356493500847, y: -0.4076037345479522 },
  {
    x: -2.207987461709049,
    y: -0.24624661291661493
  },
  { x: -2.092790721670198, y: -0.09969190907439948 },
  { x: -1.968020321849682, y: 0.031228470052801424 },
  {
    x: -1.8357081559305342,
    y: 0.1459388023899716
  },
  { x: -1.6979103269204354, y: 0.24412265016106796 },
  { x: -1.5566743570229433, y: 0.3257217935624512 },
  {
    x: -1.4140069255464776,
    y: 0.3909310406150472
  },
  { x: -1.2718426512087313, y: 0.4401890213776308 },
  { x: -1.1320144168302997, y: 0.4741651390925787 },
  {
    x: -0.9962257080518395,
    y: 0.49374291234921497
  },
  { x: -0.8660254037844379, y: 0.5 },
  { x: -0.7427854151649611, y: 0.49418525342534914 },
  { x: -0.6276815225017216, y: 0.4776931879653682 },
  {
    x: -0.5216777068275837,
    y: 0.45203630616385526
  },
  { x: -0.4255142150838503, y: 0.4188157392474503 },
  { x: -0.339699536571329, y: 0.3796906994504983 },
  {
    x: -0.2645064041176685,
    y: 0.33634725397614756
  },
  { x: -0.19997186746043472, y: 0.29046694126779365 },
  { x: -0.14590141969923048, y: 0.24369575169727115 },
  {
    x: -0.10187709140448507,
    y: 0.19761398773864874
  },
  { x: -0.067269362155694, y: 0.1537075033070069 },
  { x: -0.04125267696479819, y: 0.11334079845283886 },
  {
    x: -0.02282429622726175,
    y: 0.07773241439781345
  },
  { x: -0.010826153483909647, y: 0.04793303548419288 },
  { x: -0.003969346248212672, y: 0.024806659611843175 },
  {
    x: -0.0008608422479551235,
    y: 0.00901514788346254
  },
  { x: -3.1947339570798534e-5, y: 0.001006408294485977 },
  { x: 3.194733957079898e-5, y: 0.001006408294485977 },
  {
    x: 0.0008608422479551275,
    y: 0.00901514788346254
  },
  { x: 0.003969346248212718, y: 0.02480665961184339 },
  { x: 0.010826153483909647, y: 0.04793303548419288 },
  {
    x: 0.022824296227261846,
    y: 0.07773241439781366
  },
  { x: 0.04125267696479819, y: 0.11334079845283886 },
  { x: 0.06726936215569425, y: 0.15370750330700725 },
  {
    x: 0.10187709140448507,
    y: 0.19761398773864874
  },
  { x: 0.14590141969923082, y: 0.24369575169727145 },
  { x: 0.19997186746043472, y: 0.29046694126779365 },
  {
    x: 0.2645064041176689,
    y: 0.3363472539761478
  },
  { x: 0.339699536571329, y: 0.3796906994504983 },
  { x: 0.4255142150838509, y: 0.4188157392474506 },
  {
    x: 0.5216777068275837,
    y: 0.45203630616385526
  },
  { x: 0.6276815225017224, y: 0.47769318796536836 },
  { x: 0.7427854151649611, y: 0.49418525342534914 },
  {
    x: 0.8660254037844397,
    y: 0.49999999999999994
  },
  { x: 0.9962257080518402, y: 0.49374291234921486 },
  { x: 1.1320144168303004, y: 0.47416513909257857 },
  {
    x: 1.2718426512087313,
    y: 0.4401890213776308
  },
  { x: 1.4140069255464789, y: 0.3909310406150466 },
  { x: 1.5566743570229442, y: 0.3257217935624507 },
  {
    x: 1.6979103269204359,
    y: 0.24412265016106766
  },
  { x: 1.8357081559305342, y: 0.1459388023899716 },
  { x: 1.9680203218496832, y: 0.031228470052800134 },
  {
    x: 2.092790721670199,
    y: -0.09969190907440044
  },
  { x: 2.207987461709049, y: -0.24624661291661493 },
  { x: 2.3116356493500847, y: -0.40760373454795157 },
  {
    x: 2.4018496583744944,
    y: -0.5826824223639321
  },
  { x: 2.4768643467509186, y: -0.7701641692267175 },
  { x: 2.535064721046505, y: -0.9685079935079888 },
  {
    x: 2.5750135650632955,
    y: -1.1759692920584897
  },
  { x: 2.5954765815299354, y: -1.3906220856792564 },
  { x: 2.5954446341903643, y: -1.6103843226152308 },
  {
    x: 2.57415272281534,
    y: -1.833045855824974
  },
  { x: 2.531095374798292, y: -2.056298666103856 },
  { x: 2.466038193267009, y: -2.277768866257477 },
  {
    x: 2.3790253621472317,
    y: -2.4950499920338824
  },
  { x: 2.270382972385287, y: -2.705737063904886 },
  { x: 2.1407180995533537, y: -2.9074608903903933 },
  {
    x: 1.9909136302657129,
    y: -3.09792207866425
  },
  { x: 1.822118902150452, y: -3.2749242217500725 },
  { x: 1.6357362884701006, y: -3.436405743657764 },
  {
    x: 1.4334039228027657,
    y: -3.5804699041372166
  },
  { x: 1.216974820451614, y: -3.7054124930129495 },
  { x: 0.9884927104626274, y: -3.8097467798624978 },
  {
    x: 0.7501649443811457,
    y: -3.8922253275414866
  },
  { x: 0.5043328943285764, y: -3.951858327057947 },
  { x: 0.2534402928868778, y: -3.987928165774564 },
  { x: 4.898587196589413e-16, y: -4.0 }
];