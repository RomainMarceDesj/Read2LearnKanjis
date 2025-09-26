import json
import os

# Open Txt file
try:
    with open (os.path.join('C:\\Users\\romai\\FirstBareBonesProject\\TestingBackEnd', 'StateNameText.txt'), 'r') as file:
        contentStates = file.read()
except FileNotFoundError:
    print("Error: The file 'StateNameText.txt' was not found.")
    exit()


#Open Json
try :
    with open(os.path.join('C:\\Users\\romai\\FirstBareBonesProject\\TestingBackEnd', 'TestDataJson.json'), 'r') as file:
        contentJson = json.load(file)
       
except FileNotFoundError:
    print("Error: The file 'TestDataJson.json' was not found.")
    exit()

#Print testing
for state in contentJson["States"]:
    print(state["name"])