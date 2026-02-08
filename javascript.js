// Funktion för att ladda data från localStorage eller skapa standarddata
function loadDataFromStorage() {
    const savedData = localStorage.getItem('vmData');
    if (savedData) {
        return JSON.parse(savedData);
    }
    
    // Om ingen lokal data finns, skapa standarddata
    return { 
        vmNames: [], 
        osList: ["Ubuntu 22.04", "CentOS 8", "Debian 11", "Windows Server 2019"], 
        ipAddresses: [], 
        guiLinks: [], 
        descriptions: [], 
        services: [], 
        dependencies: [] 
    };
}

// Funktion för att spara data till localStorage
function saveDataToStorage(data) {
    localStorage.setItem('vmData', JSON.stringify(data));
}

// Funktion för att spara alla värden
function saveAllData() {
    const form = document.getElementById('vmForm');
    
    // Samla data från formuläret
    const vmName = document.getElementById('vmName').value;
    const os = document.getElementById('os').value;
    const ipAddress = document.getElementById('ipAddress').value;
    const guiLink = document.getElementById('guiLink').value;
    const description = document.getElementById('description').value;

    // Hämta tjänster
    const serviceInputs = document.querySelectorAll('.service-input');
    const services = Array.from(serviceInputs).map(input => input.value.trim()).filter(v => v !== '');

    // Hämta beroenden
    const dependencyInputs = document.querySelectorAll('.dependency-input:not(.service-input)');
    const dependencies = Array.from(dependencyInputs).map(input => input.value.trim()).filter(v => v !== '');

    // Ladda befintlig data
    let savedData = loadDataFromStorage();
    
    // Lägg till nya värden om de inte redan finns
    if (vmName && !savedData.vmNames.includes(vmName)) {
        savedData.vmNames.push(vmName);
    }
    
    if (os && !savedData.osList.includes(os)) {
        savedData.osList.push(os);
    }
    
    if (ipAddress && !savedData.ipAddresses.includes(ipAddress)) {
        savedData.ipAddresses.push(ipAddress);
    }
    
    if (guiLink && !savedData.guiLinks.includes(guiLink)) {
        savedData.guiLinks.push(guiLink);
    }
    
    if (description && !savedData.descriptions.includes(description)) {
        savedData.descriptions.push(description);
    }
    
    services.forEach(service => {
        if (service && !savedData.services.includes(service)) {
            savedData.services.push(service);
        }
    });
    
    dependencies.forEach(dependency => {
        if (dependency && !savedData.dependencies.includes(dependency)) {
            savedData.dependencies.push(dependency);
        }
    });

    // Spara uppdaterad data
    saveDataToStorage(savedData);
    
    alert('Alla värden har sparats!');
}

// Funktion för att exportera data till JSON-fil (som skapas vid nästa laddning)
function exportData() {
    const savedData = loadDataFromStorage();
    
    // Skapa blob med JSON-data
    const dataStr = JSON.stringify(savedData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    // Skapa en temporär länk för nedladdning
    const exportFileDefaultName = 'data.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    alert('Data har exporterats till data.json');
}

// Funktion för att importera data från JSON-fil
function importData() {
    // Använd en input element för att välja filen
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        
        reader.onload = function(event) {
            try {
                const importedData = JSON.parse(event.target.result);
                
                // Spara den importerade datan
                saveDataToStorage(importedData);
                
                // Uppdatera dropdowns efter import
                updateDropdowns();
                
                alert('Data har importerats!');
            } catch (error) {
                console.error('Fel vid import:', error);
                alert('Fel vid import: Felaktig JSON-fil');
            }
        };
        
        reader.onerror = function() {
            alert('Fel vid läsning av fil');
        };
        
        reader.readAsText(file);
    };
    
    // Klicka på input-elementet för att öppna filväljaren
    fileInput.click();
}

// Funktion för att uppdatera dropdowns med sparade värden
function updateDropdowns() {
    const savedData = loadDataFromStorage();
    const osSelect = document.getElementById('os');
    
    // Rensa befintliga alternativ (bevara första option)
    while (osSelect.options.length > 1) {
        osSelect.remove(1);
    }
    
    // Lägg till tidigare värden
    savedData.osList.forEach(os => {
        const option = document.createElement('option');
        option.value = os;
        option.textContent = os;
        osSelect.appendChild(option);
    });
}

// Funktion för att lägga till nytt operativsystem
function addNewOS() {
    const newOsInput = document.getElementById('newOs');
    const newOsValue = newOsInput.value.trim();
    
    if (newOsValue) {
        const savedData = loadDataFromStorage();
        
        // Lägg till om det inte redan finns
        if (!savedData.osList.includes(newOsValue)) {
            savedData.osList.push(newOsValue);
            saveDataToStorage(savedData);
            
            // Uppdatera dropdown
            updateDropdowns();
            
            // Rensa inputfältet
            newOsInput.value = '';
            
            alert(`Nytt operativsystem "${newOsValue}" har lagts till!`);
        } else {
            alert(`Operativsystem "${newOsValue}" finns redan!`);
        }
    }
}

// Lägg till event listeners för knappar
document.addEventListener('DOMContentLoaded', function() {
    // Byt tema
    document.getElementById('themeToggle').addEventListener('click', function() {
        const body = document.body;
        const toggleButton = this;
        
        if (body.classList.contains('dark-theme')) {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
            toggleButton.textContent = 'Byt till Mörkt Tema';
        } else {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
            toggleButton.textContent = 'Byt till Ljust Tema';
        }
    });

    // Spara data-knapp
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    
    // Importera data-knapp
    document.getElementById('importDataBtn').addEventListener('click', importData);
    
    // Lägg till OS-knapp
    document.getElementById('addOsBtn').addEventListener('click', addNewOS);
    
    // Enter-tangent för att lägga till nytt OS
    document.getElementById('newOs').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addNewOS();
        }
    });

    // Lägg till tjänst-knapp
    document.getElementById('addServiceBtn').addEventListener('click', function() {
        const container = document.getElementById('servicesContainer');
        const newItem = document.createElement('div');
        newItem.className = 'dependency-item';
        newItem.innerHTML = '<input type="text" class="dependency-input service-input" placeholder="Ex: Apache HTTP Server"><button type="button" class="remove-btn">Ta bort</button>';
        container.appendChild(newItem);
        
        // Lägg till event för ta bort-knapp
        newItem.querySelector('.remove-btn').addEventListener('click', function() {
            if (container.children.length > 1) { // Säkerställ att minst en rad finns kvar
                container.removeChild(newItem);
            }
        });
    });

    // Lägg till beroende-knapp
    document.getElementById('addDependencyBtn').addEventListener('click', function() {
        const container = document.getElementById('dependenciesContainer');
        const newItem = document.createElement('div');
        newItem.className = 'dependency-item';
        newItem.innerHTML = '<input type="text" class="dependency-input dependency-input" placeholder="Ex: Database Server"><button type="button" class="remove-btn">Ta bort</button>';
        container.appendChild(newItem);
        
        // Lägg till event för ta bort-knapp
        newItem.querySelector('.remove-btn').addEventListener('click', function() {
            if (container.children.length > 1) { // Säkerställ att minst en rad finns kvar
                container.removeChild(newItem);
            }
        });
    });

    // Generera Markdown
    document.getElementById('vmForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const vmName = document.getElementById('vmName').value;
        const os = document.getElementById('os').value;
        const ipAddress = document.getElementById('ipAddress').value;
        const guiLink = document.getElementById('guiLink').value;
        const description = document.getElementById('description').value;

        // Hämta tjänster
        const serviceInputs = document.querySelectorAll('.service-input');
        const services = Array.from(serviceInputs).map(input => input.value.trim()).filter(v => v !== '');

        // Hämta beroenden
        const dependencyInputs = document.querySelectorAll('.dependency-input:not(.service-input)');
        const dependencies = Array.from(dependencyInputs).map(input => input.value.trim()).filter(v => v !== '');

        // Generera Markdown
        let markdown = `## ${vmName}\n\n`;
        
        if (os) {
            markdown += `* OS: ${os}\n`;
        }
        
        if (ipAddress) {
            markdown += `* IP-Adress: ${ipAddress}\n`;
        }
        
        if (guiLink) {
            markdown += `* GUI Länk: [${guiLink}](${guiLink})\n\n`;
        } else {
            markdown += "\n";
        }

        if (description) {
            markdown += "### Beskrivning\n" + description + "\n\n";
        }

        // Generera tjänster
        if (services.length > 0) {
            markdown += "### Tjänster:\n";
            services.forEach(service => {
                markdown += `* ${service}\n`;
            });
            markdown += "\n";
        }

        // Generera beroenden
        if (dependencies.length > 0) {
            markdown += "### Beroenden:\n";
            dependencies.forEach(dependency => {
                markdown += `* ${dependency}\n`;
            });
            markdown += "\n";
        }

        document.getElementById('output').textContent = markdown;
    });

    // Kopiera till clipboard
    document.getElementById('copyBtn').addEventListener('click', function() {
        const outputElement = document.getElementById('output');
        if (outputElement.textContent.trim() !== '') {
            navigator.clipboard.writeText(outputElement.textContent).then(() => {
                alert('Markdown-kod kopierad till urklipp!');
            }).catch(err => {
                console.error('Misslyckades att kopiera: ', err);
            });
        } else {
            alert('Ingen Markdown-kod att kopiera');
        }
    });

    // Lägg till event för borttagningsknappar
    document.getElementById('servicesContainer').addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-btn')) {
            const container = document.getElementById('servicesContainer');
            if (container.children.length > 1) {
                container.removeChild(e.target.parentElement);
            }
        }
    });

    document.getElementById('dependenciesContainer').addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-btn')) {
            const container = document.getElementById('dependenciesContainer');
            if (container.children.length > 1) {
                container.removeChild(e.target.parentElement);
            }
        }
    });
    
    // Uppdatera dropdowns vid laddning
    updateDropdowns();
});

