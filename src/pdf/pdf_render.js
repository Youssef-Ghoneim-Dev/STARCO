import {
  Page,
  Text,
  Document,
  StyleSheet,
  View,
  Image,
  Font,
} from '@react-pdf/renderer';
Font.register({
  family: 'Amiri',
  src: '/Amiri-Regular.ttf',
});
Font.register({
  family: 'AmiriBold',
  src: '/Amiri-Bold.ttf',
});
const styles = StyleSheet.create({
  page: {
    width: 1920,
    height: 1080,
    position: 'relative',
    fontFamily: 'Amiri'
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  overlayText: {
    direction: "rtl",
    padding: "5px",
    position: 'absolute',
    fontSize: 45,
    width: "465px",
    color: 'white',
    textAlign: 'right',
    top: "575px",
    left: "710px", 
  },
    div: {
        width: "100%",
        height: "100%",
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },

    table: {
        display: 'flex',
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        width: "85%",
        height: "85%",
        gap: "20px"
    },
    row: {
        height: 420,
        display: "flex",
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
    },
    rowf: {
        height: 420,
        display: "flex",
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
    },
    cell: {
        fontSize: 50,
        color: 'white',
        width: 300,
        padding: 0,
        textAlign: 'center',
        textAlignVertical: 'center',
        fontFamily: 'AmiriBold',
    },
    cellp: {
        fontSize: 50,
        color: 'white',
        width: 300,
        padding: 0,
        textAlign: 'center',
        fontFamily: 'AmiriBold',
        textAlignVertical: 'center',
    },
    cellData: {
        fontSize: 50,
        color: 'black',
        width: 300,
        padding: 0,
        textAlign: 'center',
        fontFamily: 'Amiri',
        textAlignVertical: 'center',
    },

    bold: {
        fontFamily: 'AmiriBold',
        direction: "rtl"
    },
    cellWrapper: {
        height: 200,
        width: 300,
        backgroundColor: '#a1cada',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cellWrapperG: {
        height: 200,
        width: 300,
        backgroundColor: '#355f7a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cellWrapperFull: {
        backgroundColor: '#355f7a',
        width: 300,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    }
});
function MyDocument({ selectedThickness = [], price2 = [], clientName = '', plateName = '',selectedBuyer = '',fontSize = 45 }) {
  return (
    <Document>
    <Page size={{ width: 1920, height: 1080 }} style={styles.page}>
      <Image src="/1.png" style={styles.image} />
      <Text style={styles.overlayText}>{selectedBuyer + " / " + clientName}</Text>
    </Page>
    <Page size={{ width: 1920, height: 1080 }} style={styles.page}>
        <Image src="/2.png" style={styles.image} />
        <View style={styles.div}>
        <View style={styles.table}>
            <View style={styles.row}>
            <View style={styles.cellWrapperG}>
                <Text style={styles.cell}>Name</Text>
            </View>
            <View style={styles.cellWrapper}>
                <Text style={[styles.cellData,{fontSize}, styles.bold]}>{plateName}</Text>
            </View>
            </View>
            <View style={styles.rowf}>
            <View style={styles.cellWrapperFull}>
                <Text style={styles.cellp}>
                Final{'\n'}price
                </Text>
            </View>
            </View>
            {selectedThickness.map((thickness, index) => (
            <View style={styles.row} key={`row-${index}`}>
                <View style={styles.cellWrapperG}>
                <Text style={styles.cell}>{thickness} mm</Text>
                </View>
                <View style={styles.cellWrapper}>
                <Text style={styles.cellData}>{price2[index]}</Text>
                </View>
            </View>
            ))}
        </View>
        </View>



        
    </Page>
    <Page size={{ width: 1920, height: 1080 }} style={styles.page}>
      <Image src="/3.png" style={styles.image} />
    </Page>
  </Document>
  );
}
export default MyDocument;
