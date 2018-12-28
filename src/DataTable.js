/**
 * @Date: 2018-12-12
 * @Author pengweiqiang
 * @Project DataTable
 * @Description
 * DataTable组件，使用说明
 * //TODO 待优化点：
 * 1.字段有点冗余，比如showProgressBarKeys,datakeys，可以放在head中。
 * 2.当排序列太多时，组件渲染render()执行有点慢。需要进行diff优化
 *  <DataTable
         leftKey='fenqudao' //表格最左侧的行头字段 String  [必传]
         head={[{name:'金额(万)',sort:'desc'},{name:'预算(万)'}]} //顶部表头数据  Array 举个🌰 [{name:'金额(万)',sort:'desc'},{name:'预算(万)'}]  name为表头显示名称；sort为排序方式,不传不排序   [必传]
         list={this.state.tableDatas} //表格数据 Array  [必传]
         dataKeys={['jinewan','yusuanwan','dachenglv','shuliang','liandailv']} //表格中需要展示的列属性key，依次按照先后顺序展示  [必传，不传默认显示全部]
         showProgressBarKeys={['jinewan','yusuanwan']}  //是否展示颜色比例，传入要显示的列名，这个字段有点冗余，应该放在head里面，后期设计放在一个字段中  [可选]
         unstatisticsRows={['合计']} //不需要统计某一行数据，传入行头  [可选]
         onClickItemCell 点击右侧单元格的事件，事件回调返回行row，列column，以及点击内容 [可选]
         onClickHeadItemCell 点击表头头部单元格的事件，事件回调返回行row，列column，以及点击内容 [可选]
 />
 */
import React, { PureComponent } from 'react';
import {
    StyleSheet, Text, View, ScrollView, FlatList,TouchableOpacity, Animated
} from 'react-native';
import PropTypes from 'prop-types';
import * as Progress from 'react-native-progress';
import Icon from 'react-native-vector-icons/FontAwesome';

//左侧行头的flatList组件实例
let leftFlat = null;
//右侧内容FlatList组件实例
let rightFlat = null;
//统计每列的总和数
let totalColumsProgress = null;

export default class DataTable extends PureComponent {
    static propTypes: {
        //头部数据
        head: PropTypes.array,
        //数据源
        list: PropTypes.array,
        //要显示列的属性key依次显示
        dataKeys:PropTypes.array,
        //左侧固定行头
        leftKey:PropTypes.string,
        //需要按进度条展示的列 可选（默认不支持）
        showProgressBarKeys:PropTypes.array,
        //排除指定行，不计入某列的总数中（默认全部统计）
        unstatisticsRows:PropTypes.array,
        //点击单元格的事件
        onClickItemCell:PropTypes.func,
        //点击表头单元格的事件
        onClickHeadItemCell:PropTypes.func,
    };
    constructor(props){
        super(props);
    }

    _keyExtractor = (item, index) => index.toString();

    _leftHeadRender(leftTitles) {
        if (leftTitles.length === 0) {
            return null;
        }
        return (
            <View style={styles.firstCell}>
                {leftTitles.map((item, i) => (
                    <View key={`lhead${i}`} style={styles.cellView}>
                        <Text>{item["name"]}</Text>
                    </View>
                ))}
            </View>
        );
    }
    //顶部表头
    _rightHeadRender(rightTitles) {
        if (rightTitles.length === 0) {
            return null;
        }
        return (
            <View style={styles.rightTitleListRow}>
                {rightTitles.map((item, i) => (
                    <TouchableOpacity activeOpacity={0.5}
                                      key={`rhead${i}`}
                                      onPress={() => {
                                          let sort = item["sort"];

                                          if(sort !== undefined && sort !== ''){
                                              sort = (item["sort"]==='desc' ? "asc":"desc");
                                              this.props.head[i+1]["sort"] = sort;
                                              console.log(this.props.head);
                                              this._sortDataListByColumn(i,sort);
                                              this.setState({
                                                  sort:new Date().getTime(),
                                              });
                                          }

                                          console.log("row="+0+" column="+(i+1)+" value="+JSON.stringify(item));
                                          this._onClickHeadItemCell(item,0,i+1);
                                      }}>
                        <View  style={styles.cellView}>
                            <Text>{item["name"]}</Text>
                            {
                                item["sort"]!==undefined &&
                                <Icon name={item["sort"]==='desc'?"caret-down":"caret-up"} size={20} style={styles.sortIconTransform}/>
                            }

                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        );
    }
    //左侧表头
    _leftRenderRow(rowData) {
        return (
            <View style={[styles.leftListRow,rowData.index%2 && styles.tableCellBackground]}>
                {Object.keys(rowData.item).map(key => (
                    <View key={`llist${key}`} style={styles.cellView}>
                        <Text>{rowData.item[key]}</Text>
                    </View>
                ))}
            </View>
        );
    }

    //主内容
    _rightRenderRow(rowData) {
        const dataKeys = this.props.dataKeys;
        const showProgressBarKeys = this.props.showProgressBarKeys;

        return (
            <View style={styles.rightListRow}>

                {(dataKeys !== undefined) && dataKeys.map((key, i) => (

                    <TouchableOpacity activeOpacity={0.5}
                                      key={`rlist${key}`}
                                      onPress={() => {
                                          console.log("row="+(rowData.index+1)+" column="+(i+1)+" value="+JSON.stringify(rowData.item[key]));
                                          this._onClickItemCell(rowData.item[key],rowData.index+1,i+1);
                                      }}>
                        <View  style={[styles.cellRightView, rowData.index%2 && styles.tableCellBackground]}>
                            {(showProgressBarKeys!=undefined && showProgressBarKeys.indexOf(key)>-1) &&
                            <Progress.Bar progress={rowData.item[key]/totalColumsProgress.get(key)} width={99} borderWidth={0} height={38} borderRadius={0} style={{position:'absolute'}} color={"#6495ED"}/>
                            }

                            <Text>{rowData.item[key]}</Text>
                        </View>
                    </TouchableOpacity>
                ))}


            </View>
        );
    }

    /**
     * 点击右侧FlatList单元格
     * @param value 点击的值
     * @param row 处于第几行
     * @param column 处于第几列
     * @private
     */
    _onClickItemCell(value,row,column){
        this.props.onClickItemCell(value,row,column);
    }
    /**
     * 点击表头FlatList单元格
     * @param value 点击的值
     * @param row 处于第几行
     * @param column 处于第几列
     * @private
     */
    _onClickHeadItemCell(value,row,column){
        if(this.props.onClickHeadItemCell !== undefined)
            this.props.onClickHeadItemCell(value,row,column);
    }


    rightScroll(e) {
        const newScrollOffset = e.nativeEvent.contentOffset.y;
        leftFlat.scrollToOffset({ offset: newScrollOffset, animated: false });
    }

    /**
     滑动左侧列头
     bug：左侧列头滑动，会出现和右侧flatlist的rightScroll滑动冲突
     解决方案：判断滑动的是左侧flatList还是右侧FlatList，禁止对方的scrollenable，解决冲突，待校验。
     */
    leftScroll(e) {
        const newScrollOffset = e.nativeEvent.contentOffset.y;
        rightFlat.scrollToOffset({ offset: newScrollOffset, animated: false });
    }

    _sortDataListByColumn(column,sort){
        const list = this.props.list;
        let columnName = this.props.dataKeys[column];
        list.sort(function(a,b){
            if(sort === 'desc'){
                return b[columnName]-a[columnName];
            }else{
                return a[columnName]-b[columnName];
            }

        });
        console.log(list);
    }

    render() {
        const list = this.props.list;
        //防止重复进入render
        if(list === undefined || list.length===0){
            return null;
        }
        console.log(this.props.head);
        const leftHead = this.props.head.slice(0, 1);
        const rightHead = this.props.head.slice(1);

        const showProgressBarKeys = this.props.showProgressBarKeys;
        totalColumsProgress = new Map();



        const leftKey = this.props.leftKey;
        const leftList = [];
        const rightList = [];

        list.map((item, r) => {
            //是否统计该行的总数
            var isUnstatisticsRow = this.props.unstatisticsRows != undefined ? this.props.unstatisticsRows.indexOf(item[leftKey])!=-1:false;
            Object.keys(item).map((key, i) => {
                if (key === leftKey) {

                    leftList.push({ [key]: item[key] });
                    // delete item[key];
                    rightList.push(item);
                }else{
                    if(isUnstatisticsRow){
                        return;
                    }
                    //统计指定列的总数
                    if(showProgressBarKeys!=undefined && showProgressBarKeys.indexOf(key) > -1){
                        if(totalColumsProgress.has(key)){
                            totalColumsProgress.set(key,parseFloat(item[key])+totalColumsProgress.get(key));
                        }else{
                            totalColumsProgress.set(key,parseFloat(item[key]));
                        }
                    }
                }

            });
        });

        console.log(leftHead, rightHead, leftList, rightList,totalColumsProgress);

        return (
            <View style={styles.container}>
                <View style={styles.left}>
                    {this._leftHeadRender(leftHead)}
                    <FlatList
                        ref={ref => leftFlat = ref}
                        data={leftList}
                        renderItem={item => this._leftRenderRow(item)}
                        keyExtractor={this._keyExtractor}
                        scrollEnabled={false}
                        showsVerticalScrollIndicator={false}
                    />
                </View>
                <ScrollView horizontal bounces={false} showsHorizontalScrollIndicator={false}>
                    <View style={styles.right}>
                        {this._rightHeadRender(rightHead)}
                        <FlatList
                            ref={ref => rightFlat = ref}
                            data={rightList}
                            renderItem={item => this._rightRenderRow(item)}
                            onScroll={e => this.rightScroll(e)}
                            scrollEventThrottle={1}
                            keyExtractor={this._keyExtractor}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                </ScrollView>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        // marginTop: 20,
        flex: 1,
        backgroundColor: '#F5FCFF',
    },
    left: {
        // backgroundColor: 'yellow',
        flexDirection: 'column',
        backgroundColor: 'white',
    },
    right: {
        backgroundColor: 'white',
    },
    //左侧表格行头
    leftListRow: {
        alignItems: 'center', // 水平局中
        justifyContent: 'center', // 垂直居中
        borderColor: '#DCD7CD',
    },

    firstCell: {
        alignItems: 'center', // 水平局中
        justifyContent: 'center', // 垂直居中
        borderColor: '#DCD7CD',
        backgroundColor:'#c1c1c1'
    },
    rightListRow: {
        width: '100%',
        flexDirection: 'row',
    },
    //顶部表头
    rightTitleListRow:{
        width: '100%',
        flexDirection: 'row',
        backgroundColor:'#c1c1c1'
    },
    cellView: {
        width: 100,
        height: 40,
        // backgroundColor: '#db384c',
        borderColor: '#DCD7CD',
        borderRightWidth: 1,
        borderBottomWidth: 1,
        flexDirection:'row',
        alignItems: 'center', // 水平局中
        justifyContent: 'center', // 垂直居中
    },
    cellRightView:{
        width: 100,
        height: 40,
        borderColor: '#DCD7CD',
        borderRightWidth: 1,
        borderBottomWidth: 1,
        alignItems: 'center', // 水平局中
        justifyContent: 'center', // 垂直居中
    },
    tableCellBackground:{
        backgroundColor: '#F7F6E7'//偶数行 背景颜色
    },

    sortIconTransform:{
        marginLeft:3,
        // transform: [{rotate:'180deg'}]
    },
});