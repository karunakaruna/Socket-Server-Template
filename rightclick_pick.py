coords = op('coords')
dat = op('dat_out')
select = op('select1')
def onTableChange(dat):
	if select['aux',1] == 4:
		instance = op('dat_out')['instance',1] + 1
		if instance != 0:
			print(str(instance))
			op('select_id').par.rowindexstart = instance
			op('listening_id').par.rowindexstart = instance
			op('update_listeningto').run()
	return

def onRowChange(dat, rows):
	return

def onColChange(dat, cols):
	return

def onCellChange(dat, cells, prev):
	return

def onSizeChange(dat):
	return
	